import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionDigest, withEditorialAnnotations } from './codexEditorialAnnotations.js';
import { citation, grant, later, link, parental, readAnnotated, readReader, records, request, siteId, snapshot, target } from './fixture.mjs';

const kinds = reply => reply.article?.annotations?.items.map(item => item.kind) ?? [];
const run = (privateState, reader = readReader, incoming = request) =>
  withEditorialAnnotations({ readReader: reader, readSnapshot: async () => privateState, siteId })(incoming);
const one = (record, approvals = [grant(record)]) => ({ ...snapshot, records: [record], approvals });
const rewrite = edit => async incoming => {
  const dto = await readReader(incoming);
  edit(dto);
  return dto;
};

test('only eligible presentation fields are sent, cumulatively at Episodes 1 and 47', async () => {
  for (const episode of [1, 47]) {
    const reply = await readAnnotated({ ...request, episode });
    assert.deepEqual(kinds(reply), ['citation', 'citation', 'link']);
    const [c, , l] = reply.article.annotations.items;
    assert.deepEqual(Object.keys(c).sort(), ['edition','end','episode','kind','seconds','section','start','title']);
    assert.deepEqual(Object.keys(l).sort(), ['end','kind','section','start','target']);
    assert.doesNotMatch(JSON.stringify(reply), /privateC|privateL|sectionSha256|recordSha256|approval|Fictional-test-site/i);
  }
});

for (const [name, approvals] of [
  ['missing', []],
  ['revoked', [{ ...grant(citation), status: 'revoked' }]],
  ['pending', [{ ...grant(citation), status: 'pending' }]],
  ['invalid digest', [{ ...grant(citation), recordSha256: '0'.repeat(64) }]],
  ['ambiguous receipt', [grant(citation), grant(citation)]]
]) {
  test(name + ' approval withholds the citation', async () => {
    assert.deepEqual(kinds(await run(one(citation, approvals))), []);
  });
}

test('record revocation and stale approval after metadata edits fail closed', async () => {
  assert.deepEqual(kinds(await run(one({ ...citation, status: 'revoked' }))), []);
  assert.deepEqual(kinds(await run(one({ ...citation, seconds: 43 }, [grant(citation)]))), []);
});

test('wrong site, malformed snapshot and private-store outage leave base article usable', async () => {
  for (const bad of [null, { ...snapshot, siteId: 'wrong-site' }, { ...snapshot, records: {} }]) {
    const reply = await run(bad);
    assert.equal(reply.status, 'ready');
    assert.deepEqual(kinds(reply), []);
  }
  const failed = withEditorialAnnotations({ readReader, readSnapshot: async () => { throw Error('SECRET'); }, siteId });
  assert.deepEqual(kinds(await failed(request)), []);
});

test('section edits, reorder and duplicate headings invalidate placements', async () => {
  for (const edit of [
    dto => { dto.article.sections[0].text += ' Edit.'; },
    dto => dto.article.sections.unshift({ heading: 'New', text: 'New section.' }),
    dto => dto.article.sections.push({ ...dto.article.sections[0] })
  ]) assert.deepEqual(kinds(await run(snapshot, rewrite(edit))), []);
});

test('missing and repeated anchors fail even with a matching reviewed section hash', async () => {
  for (const text of ['Missing passage.', 'Painted Harbor. Painted Harbor.']) {
    const heading = citation.heading;
    const reviewed = { ...citation, sectionSha256: sectionDigest({ heading, text }) };
    assert.deepEqual(kinds(await run(one(reviewed), rewrite(dto => {
      dto.article.sections[0] = { heading, text };
    }))), []);
  }
});

test('malformed metadata, duplicate IDs, and conflicting links are withheld', async () => {
  for (const change of [{ seconds: -1 }, { edition: 'apple' }, { episode: 2 }, { title: '' }, { anchor: [] }]) {
    assert.deepEqual(kinds(await run(one({ ...citation, ...change }))), []);
  }
  assert.deepEqual(kinds(await run({ ...one(citation), records: [citation, citation] })), []);
  const competing = { ...link, id: 'L2', approvalId: 'privateL2' };
  assert.deepEqual(kinds(await run({ ...snapshot, records: [...records, competing],
    approvals: [...snapshot.approvals, grant(competing)] })), ['citation', 'citation']);
});

test('hidden, missing and cross-campaign targets do not reach the payload', async () => {
  for (const alias of [later, parental, 'r-' + '8'.repeat(32)]) {
    const reply = await run(one({ ...link, target: alias }));
    assert.deepEqual(kinds(reply), []);
    assert.ok(!JSON.stringify(reply).includes(alias));
  }
  const delayed = one({ ...link, target: later, reveal: 47 });
  assert.deepEqual(kinds(await run(delayed)), []);
  assert.deepEqual(kinds(await run(delayed, readReader, { ...request, episode: 47 })), ['link']);
  assert.deepEqual(kinds(await run(one(link), rewrite(dto => {
    dto.entries = dto.entries.filter(e => e.slug !== target);
  }))), []);
});

test('requests for a restricted source, directory or mismatched campaign do not read the store', async () => {
  const calls = [];
  const read = withEditorialAnnotations({ readReader, siteId, readSnapshot: scope => calls.push(scope) });
  for (const input of [{ ...request, slug: later }, { ...request, slug: '' },
    { ...request, campaign: 'parental' }, { ...request, slug: 'L1' }]) {
    assert.deepEqual(kinds(await read(input)), []);
  }
  assert.deepEqual(calls, []);
  const otherCampaignRecord = { ...citation, campaign: 'parental' };
  assert.deepEqual(kinds(await run(one(otherCampaignRecord))), []);
});

test('legacy metadata is stripped and unauthorized sources cannot trigger the projection', async () => {
  const reply = await run(snapshot, rewrite(dto => {
    dto.article.inlineLinkApproval = { receipt: 'SECRET' };
    dto.article.inlineLinks = [{ target: later }];
    dto.entries = dto.entries.filter(e => e.slug !== request.slug);
  }));
  assert.deepEqual(kinds(reply), []);
  assert.doesNotMatch(JSON.stringify(reply), /SECRET|inlineLinkApproval|inlineLinks/);
});

test('link must have reviewed plain-body provenance and avoid protected ranges', async () => {
  assert.deepEqual(kinds(await run(one({ ...link, plainBodyVerified: false }))), []);
  const dto = await readReader(request);
  const start = dto.article.sections[0].text.indexOf(link.anchor);
  const protectedRanges = [{ start, end: start + link.anchor.length }];
  assert.deepEqual(kinds(await run(one({ ...link, protectedRanges }))), []);
  assert.deepEqual(kinds(await run(one({ ...link, anchor: 'Painted Harbo' }))), []);
});

test('revoking the current snapshot removes the citation on the next read', async () => {
  let current = one(citation);
  const read = withEditorialAnnotations({ readReader, siteId, readSnapshot: async () => current });
  assert.deepEqual(kinds(await read(request)), ['citation']);
  current = one(citation, [{ ...grant(citation), status: 'revoked' }]);
  assert.deepEqual(kinds(await read(request)), []);
});
