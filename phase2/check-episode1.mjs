// Run locally against the three private inputs. Output contains no source excerpts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { recordDigest, sectionDigest, withEditorialAnnotations } from './codexEditorialAnnotations.js';

const [vttPath, sestonePath, malciusPath] = process.argv.slice(2);
if (!vttPath || !sestonePath || !malciusPath) {
  throw Error('Usage: node phase2/check-episode1.mjs TRANSCRIPT SESTONE MALCIUS');
}
const pilotHtml = await readFile(new URL('../releases/episode1-citations-test-20261117/reader.html', import.meta.url), 'utf8');
const pilot = JSON.parse(pilotHtml.match(/const EP1_PILOT = Object\.freeze\((.*)\);/)[1]);
const [vtt, sestone, malcius] = await Promise.all([vttPath, sestonePath, malciusPath].map(p => readFile(p, 'utf8')));
const normalize = value => value.replaceAll('\r\n', '\n').trim();
assert.match(normalize(vtt), /^WEBVTT\b/);
const cueStarts = new Set([...vtt.matchAll(/^(\d\d:\d\d:\d\d\.\d{3}) --> /gm)].map(m => m[1]));

// Editorially checked Apple transcript cue starts. They locate the evidence without
// quoting it or treating it as proof of alignment to any edition.
const cues = {
  S01: ['01:12.057'], S02: ['00:29.137', '00:38.657'], S03: ['12:08.337'],
  S04: ['40:09.557'], S05: ['21:02.397'], S06: ['22:25.877'],
  S07: ['33:40.737', '33:50.037', '33:55.317'], S08: ['21:33.217', '24:01.337'],
  S09: ['40:51.757'], S10: ['36:49.677', '36:55.317'],
  M01: ['17:10.557'], M02: ['17:15.417', '17:22.177'], M03: ['17:39.457'],
  M04: ['18:14.297'], M05: ['18:27.257'], M06: ['18:42.937'],
  M07: ['17:56.937'], M08: ['19:58.897']
};
const articles = [
  { slug: pilot.target, title: 'Sestone', category: 'Settlement', input: sestone,
    headings: ['Overview', 'Governing Sestone', 'Town and waterfront', 'The first investigation', 'Different accounts of the disappearances'] },
  { slug: pilot.source, title: 'Malcius Sorrow', category: 'Player character', input: malcius,
    headings: ['A Traveling Bard', 'Earning Trust', 'Inventory history: Lute'] }
].map(({ slug, title, category, input, headings }) => {
  const blocks = normalize(input).split('\n\n');
  const starts = headings.map(h => {
    assert.equal(blocks.filter(b => b === h).length, 1);
    return blocks.indexOf(h);
  });
  const sections = headings.map((heading, index) => ({
    heading, text: blocks.slice(starts[index] + 1, starts[index + 1]).join('\n\n')
  }));
  return { slug, title, category, sections, links: [] };
});

function candidate({ id, article, heading, anchor, ...specific }) {
  const found = articles.find(a => a.slug === article);
  const section = found.sections.findIndex(s => s.heading === heading);
  assert.ok(section >= 0);
  const content = found.sections[section];
  const index = content.text.indexOf(anchor);
  assert.ok(index >= 0, id);
  assert.equal(content.text.indexOf(anchor, index + 1), -1, id);
  return { id, kind: 'citation', campaign: 'main', source: article, section, heading, anchor,
    sectionSha256: sectionDigest(content), reveal: 1, status: 'pending', ...specific };
}
const records = pilot.citations.map(c => {
  for (const cue of cues[c.id]) assert.ok(cueStarts.has('00:' + cue), c.id);
  const [h, m, s] = c.at.split(':').map(Number);
  return candidate({ ...c, episode: 1, title: 'Welcome to Sestone', seconds: h * 3600 + m * 60 + s,
    edition: 'patreon-ad-free' });
});
records.push(candidate({ id: 'L1', article: pilot.source, heading: 'A Traveling Bard',
  anchor: 'Sestone', kind: 'link', target: pilot.target, plainBodyVerified: true, protectedRanges: [] }));
const entries = articles.map(({ slug, title, category }) => ({ slug, title, category, summary: '' }));
const siteId = 'offline-episode1-validation';
const readReader = async ({ slug, episode }) => ({ status: 'ready', selectedEpisode: episode, maximumEpisode: 47,
  article: articles.find(a => a.slug === slug), entries, categories: [] });
const readWith = (records, approvals) => withEditorialAnnotations({ readReader, siteId,
  readSnapshot: async () => ({ version: 1, siteId, records, approvals }) });

const pending = readWith(records, []);
// Temporary generated grants exist solely in this local process and are discarded.
const simulated = records.map(r => ({ ...r, status: 'approved', approvalId: 'offline-' + r.id }));
const projected = readWith(simulated, simulated.map(r => ({
  id: r.approvalId, status: 'approved', recordSha256: recordDigest(r)
})));
for (const episode of [1, 47]) {
  for (const { slug } of articles) {
    const request = { campaign: 'main', episode, slug };
    assert.equal((await pending(request)).article.annotations, undefined);
    const items = (await projected(request)).article.annotations.items;
    assert.equal(items.filter(i => i.kind === 'citation').length, slug === pilot.target ? 10 : 8);
    assert.equal(items.filter(i => i.kind === 'link').length, slug === pilot.target ? 0 : 1);
  }
}
console.log('18 citation placements and 1 contextual placement verified at Episodes 1 and 47 using supplied article text.');
console.log('Pending candidates withheld at both clearances. Simulated grants stayed in memory.');
console.log('Verified ' + new Set(Object.values(cues).flat()).size + ' evidence cue starts. Input SHA-256: ' +
  createHash('sha256').update(vtt).digest('hex'));
for (const { id, seconds } of records.filter(r => r.kind === 'citation')) {
  console.log(id + ' pilot second ' + seconds + ' | Apple transcript cues ' + cues[id].join(', '));
}
