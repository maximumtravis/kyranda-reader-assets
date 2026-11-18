import { recordDigest, sectionDigest, withEditorialAnnotations } from './codexEditorialAnnotations.js';

export const source = 'r-' + '1'.repeat(32);
export const target = 'r-' + '2'.repeat(32);
export const later = 'r-' + '3'.repeat(32);
export const parental = 'r-' + '4'.repeat(32);
export const siteId = 'fictional-test-site';
export const request = { campaign: 'main', episode: 1, slug: source, search: '', category: '' };
const entry = (slug, title, category = 'Places') => ({ slug, title, category, summary: title + ' summary.' });
const section = { heading: 'Arrival', text: 'The party entered Painted Harbor. They met the ferryman.\n\n' +
  'The long route wound across the hillside. '.repeat(72) };
export const baseRecord = { campaign: 'main', source, section: 0, heading: section.heading,
  sectionSha256: sectionDigest(section), reveal: 1, status: 'approved' };
export const citation = { ...baseRecord, id: 'C1', approvalId: 'privateC1', kind: 'citation',
  anchor: 'Painted Harbor', episode: 1, title: 'An invented episode', seconds: 42, edition: 'patreon-ad-free' };
export const secondCitation = { ...citation, id: 'C2', approvalId: 'privateC2',
  anchor: 'the ferryman', seconds: 95 };
export const link = { ...baseRecord, id: 'L1', approvalId: 'privateL1', kind: 'link',
  anchor: 'Painted Harbor', target, plainBodyVerified: true, protectedRanges: [] };
export const grant = r => ({ id: r.approvalId, status: 'approved', recordSha256: recordDigest(r) });
export const records = [citation, secondCitation, link];
export const snapshot = { version: 1, siteId, records, approvals: records.map(grant) };

export async function readReader({ campaign, episode, slug, search, category }) {
  const maximumEpisode = campaign === 'main' ? 47 : 3;
  if (!['main', 'parental'].includes(campaign) || !Number.isInteger(episode) ||
      episode < 1 || episode > maximumEpisode) return { status: 'unavailable' };
  const visible = campaign === 'main' ?
    [entry(source, 'Fictional travelers', 'People'), entry(target, 'Painted Harbor'),
      ...(episode >= 47 ? [entry(later, 'LATE_TITLE')] : [])] :
    [entry(parental, 'Parental fixture')];
  const selected = visible.find(e => e.slug === slug);
  if (slug && !selected) return { status: 'unavailable' };
  return { status: 'ready', selectedEpisode: episode, maximumEpisode,
    entries: slug ? visible : visible.filter(e => (!category || e.category === category) &&
      (!search || e.title.toLowerCase().includes(search.toLowerCase()))),
    categories: [...new Set(visible.map(e => e.category))],
    article: selected ? { ...selected, sections: [slug === source ? { ...section } :
      { heading: 'Overview', text: 'A short entry.' }], links: [] } : null };
}

export const readAnnotated = withEditorialAnnotations({ readReader, readSnapshot: async () => snapshot, siteId });
