import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectEditorialReader } from './codexEditorialAnnotations.js';
import { grant, link, readReader, request, siteId, snapshot, target } from './fixture.mjs';

let legacyStatus = 'approved';
let privateState = snapshot;
const contextualReader = async incoming => {
  const dto = await readReader(incoming);
  if (incoming.campaign !== 'main' || incoming.slug !== request.slug || !dto.article) return dto;
  const start = dto.article.sections[0].text.indexOf(link.anchor);
  dto.article.inlineLinkApproval = {
    version: 1, status: legacyStatus, source: incoming.slug, campaign: incoming.campaign,
    episode: incoming.episode, manifestId: 'legacyManifest', reviewId: 'legacyReview',
    targets: [target], automaticTargets: []
  };
  dto.article.inlineLinks = [{ section: 0, start, end: start + link.anchor.length, target,
    expectedText: link.anchor, status: 'approved', reviewId: 'legacyReview' }];
  return dto;
};
const reader = (enabled, scopedSite = siteId, readSnapshot = async () => privateState) =>
  selectEditorialReader({ contextualReader, deploymentSiteId: siteId,
    config: { enabled, siteId: scopedSite }, readSnapshot });
const annotations = reply => reply.article?.annotations?.items ?? [];
const links = reply => annotations(reply).filter(item => item.kind === 'link');

test('disabled and mismatched site gates preserve the old endpoint byte-for-byte', async () => {
  for (const fallback of [reader(false), reader(true, 'other-site')]) {
    assert.equal(fallback, contextualReader);
    assert.deepEqual(await fallback(request), await contextualReader(request));
  }
});

test('approved legacy occurrence wins overlap and is emitted without its review IDs', async () => {
  for (const episode of [1, 47]) {
    const reply = await reader(true)({ ...request, episode });
    assert.equal(links(reply).length, 1);
    assert.equal(annotations(reply).length, 3);
    assert.doesNotMatch(JSON.stringify(reply), /legacyReview|legacyManifest|inlineLinks|inlineLinkApproval/);
  }
});

test('approved nonoverlapping legacy and Phase 2 occurrences coexist', async () => {
  const distinct = { ...link, anchor: 'the ferryman' };
  privateState = { ...snapshot, records: [distinct], approvals: [grant(distinct)] };
  try {
    const reply = await reader(true)(request);
    assert.equal(links(reply).length, 2);
    assert.notEqual(links(reply)[0].start, links(reply)[1].start);
  } finally { privateState = snapshot; }
});

test('pending or revoked legacy projection and revoked Phase 2 records stay hidden on fresh read', async () => {
  const read = reader(true);
  const prior = await read(request);
  assert.equal(links(prior).length, 1);
  privateState = { ...snapshot, records: [link], approvals: [{ ...grant(link), status: 'revoked' }] };
  try {
    for (const status of ['pending', 'revoked']) {
      legacyStatus = status;
      assert.equal(links(await read(request)).length, 0);
    }
    assert.equal(links(prior).length, 1);
  } finally { legacyStatus = 'approved'; privateState = snapshot; }
});

test('legacy survives snapshot outage and restricted sources return no metadata', async () => {
  const read = reader(true, siteId, async () => { throw Error('store unavailable'); });
  assert.equal(links(await read(request)).length, 1);
  for (const episode of [1, 3]) {
    assert.deepEqual(await read({ ...request, campaign: 'parental', episode }), { status: 'unavailable' });
  }
});

test('Parental 3 preserves only the reviewed second occurrence; Parental 1 hides it', async () => {
  const scopedReader = async incoming => {
    const dto = await contextualReader({ ...request, episode: 1 });
    const section = dto.article.sections[0];
    section.text += ' They returned to Painted Harbor.';
    const span = dto.article.inlineLinks[0];
    span.start = section.text.lastIndexOf(span.expectedText);
    span.end = span.start + span.expectedText.length;
    dto.selectedEpisode = incoming.episode;
    dto.maximumEpisode = 3;
    dto.article.inlineLinkApproval.campaign = 'parental';
    dto.article.inlineLinkApproval.episode = 3;
    if (incoming.episode === 1) dto.entries = dto.entries.filter(entry => entry.slug !== target);
    return dto;
  };
  const read = selectEditorialReader({ contextualReader: scopedReader, deploymentSiteId: siteId,
    config: { enabled: true, siteId }, readSnapshot: async () => snapshot });
  const early = await read({ ...request, campaign: 'parental' });
  assert.equal(annotations(early).length, 0);
  assert.ok(!JSON.stringify(early).includes(target));
  const eligible = await read({ ...request, campaign: 'parental', episode: 3 });
  assert.equal(annotations(eligible).length, 1);
  assert.equal(links(eligible)[0].start, eligible.article.sections[0].text.lastIndexOf(link.anchor));
});
