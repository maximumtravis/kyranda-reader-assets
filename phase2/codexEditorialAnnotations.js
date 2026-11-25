// Install only as a private backend module. No web methods or editorial data.
import { createHash } from 'crypto';

const MAXIMUM = Object.freeze({ main: 47, parental: 3 });
const ALIAS = /^r-[0-9a-f]{32}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,139}$/;
const HASH = /^[a-f0-9]{64}$/;
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
const label = (value, max) => typeof value === 'string' && value.length <= max &&
  value.trim().length > 0 && !/[\x00-\x1f\x7f]/.test(value);
const episode = (value, maximum) => Number.isSafeInteger(value) && value >= 1 && value <= maximum;
const digest = fields => createHash('sha256').update(JSON.stringify(fields), 'utf8').digest('hex');
export const sectionDigest = section => digest([section.heading, section.text]);

// Explicit ordered fields. Bind every publishable field plus the private receipt reference.
export function recordDigest(r) {
  return digest([1, r.kind, r.id, r.campaign, r.source, r.section, r.heading, r.sectionSha256,
    r.anchor, r.reveal, r.approvalId, r.kind === 'citation' ?
      [r.episode, r.title, r.seconds, r.edition] : [r.target, r.plainBodyVerified,
        Array.isArray(r.protectedRanges) ? r.protectedRanges.map(range => [range?.start, range?.end]) : null]]);
}

function placement(article, r) {
  const section = article.sections[r.section];
  if (!section || section.heading !== r.heading || typeof section.text !== 'string' ||
      article.sections.filter(s => s.heading === r.heading).length !== 1 ||
      sectionDigest(section) !== r.sectionSha256) return null;
  const start = section.text.indexOf(r.anchor);
  if (start < 0 || section.text.indexOf(r.anchor, start + 1) >= 0) return null;
  const end = start + r.anchor.length;
  if (r.kind === 'link') {
    const word = character => Boolean(character && /[\p{L}\p{M}\p{N}\p{Pd}_'’]/u.test(character));
    if (word([...section.text.slice(0, start)].at(-1)) || word([...section.text.slice(end)][0]) ||
        r.protectedRanges.some(range => !Number.isSafeInteger(range?.start) ||
          !Number.isSafeInteger(range?.end) || range.start < 0 || range.end <= range.start ||
          range.end > section.text.length || (start < range.end && end > range.start))) return null;
  }
  // The DTO renders plain text. Also exclude URL, email, code and markup ranges
  // where an anchor could be visually misleading or shadow another destination.
  const protectedText = /\n\s*\n|https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[\w]+|`[^`]*`|\[[^\]]*\]\([^)]*\)|<a\b[^>]*>[\s\S]*?<\/a>|<code\b[^>]*>[\s\S]*?<\/code>|<[^>]*>/gi;
  if ([...section.text.matchAll(protectedText)].some(m => start < m.index + m[0].length && end > m.index)) return null;
  return { section: r.section, start, end };
}

// Translate only output of the existing trusted decorator. Its review identifiers
// are checked for envelope consistency and never included in Phase 2 responses.
function legacyLinks(dto, request) {
  const article = dto.article;
  const grant = article.inlineLinkApproval;
  if (grant?.version !== 1 || grant.status !== 'approved' || grant.source !== article.slug ||
      grant.campaign !== request.campaign || grant.episode !== request.episode ||
      !label(grant.manifestId, 200) || !label(grant.reviewId, 200) ||
      !Array.isArray(grant.targets) || grant.targets.length > 100 ||
      !Array.isArray(grant.automaticTargets) || grant.automaticTargets.length ||
      !Array.isArray(article.inlineLinks) || article.inlineLinks.length > 100) return [];
  const visible = new Map(dto.entries.map(entry => [entry.slug, entry.title]));
  const items = [];
  for (const item of article.inlineLinks) {
    if (item?.status !== 'approved' || item.reviewId !== grant.reviewId ||
        !matches(item.target, ALIAS) || item.target === article.slug ||
        !grant.targets.includes(item.target) || !label(item.expectedText, 6000) ||
        visible.get(item.target) !== item.expectedText ||
        !Number.isSafeInteger(item.section) || item.section < 0 ||
        !Number.isSafeInteger(item.start) || item.start < 0 ||
        item.end !== item.start + item.expectedText.length ||
        article.sections[item.section]?.text.slice(item.start, item.end) !== item.expectedText) continue;
    const { section, start, end, target } = item;
    items.push({ kind: 'link', section, start, end, target });
  }
  return items.filter(item => !items.some(other => other !== item && overlaps(item, other)));
}

function overlaps(a, b) {
  return a.section === b.section && a.start < b.end && a.end > b.start;
}

function presentation(request, items) {
  return { version: 1, campaign: request.campaign, through: request.episode, source: request.slug, items };
}

function project(dto, request, snapshot, siteId) {
  const { campaign, episode: through, slug } = request;
  const maximum = MAXIMUM[campaign];
  const article = dto?.article;
  if (!Object.hasOwn(MAXIMUM, campaign) || !episode(through, maximum) || !matches(slug, ALIAS) ||
      dto?.status !== 'ready' || dto.selectedEpisode !== through || dto.maximumEpisode !== maximum ||
      article?.slug !== slug || !Array.isArray(article.sections) || !Array.isArray(dto.entries) ||
      snapshot?.version !== 1 || snapshot.siteId !== siteId ||
      !Array.isArray(snapshot.records) || snapshot.records.length > 500 ||
      !Array.isArray(snapshot.approvals) || snapshot.approvals.length > 500) return null;
  const visible = new Set(dto.entries.map(e => e.slug));
  if (!visible.has(slug)) return null;

  const records = snapshot.records;
  const approvals = snapshot.approvals;
  const items = [];
  for (const r of records) {
    if (!r || r.campaign !== campaign || r.source !== slug || !matches(r.id, ID) ||
        !matches(r.approvalId, ID) || r.status !== 'approved' ||
        records.filter(other => other?.id === r.id).length !== 1 ||
        !episode(r.reveal, through) || !Number.isSafeInteger(r.section) || r.section < 0 ||
        !label(r.heading, 6000) || !matches(r.sectionSha256, HASH) || !label(r.anchor, 6000)) continue;
    let publicFields;
    if (r.kind === 'citation') {
      if (!episode(r.episode, r.reveal) || !label(r.title, 200) ||
          !Number.isSafeInteger(r.seconds) || r.seconds < 0 || r.seconds >= 86400 ||
          r.edition !== 'patreon-ad-free') continue;
      publicFields = { kind: 'citation', episode: r.episode, title: r.title, seconds: r.seconds, edition: r.edition };
    } else if (r.kind === 'link') {
      if (!matches(r.target, ALIAS) || r.target === slug || !visible.has(r.target) ||
          r.plainBodyVerified !== true || !Array.isArray(r.protectedRanges) ||
          r.protectedRanges.length > 100) continue;
      publicFields = { kind: 'link', target: r.target };
    } else continue;

    const grants = approvals.filter(a => a?.id === r.approvalId);
    if (grants.length !== 1 || grants[0].status !== 'approved' ||
        grants[0].recordSha256 !== recordDigest(r)) continue;
    const position = placement(article, r);
    if (position) items.push({ ...position, ...publicFields });
  }
  const eligible = items.filter(item => item.kind !== 'link' || !items.some(other =>
    other !== item && other.kind === 'link' && overlaps(item, other)));
  const annotations = { version: 1, campaign, through, source: slug, items: eligible };
  return eligible.length && Buffer.byteLength(JSON.stringify(annotations), 'utf8') <= 32768 ? annotations : null;
}

// readReader must be the existing trusted contextual reader, with a complete eligible directory
// for article reads. readSnapshot must read current private state scoped to this site,
// campaign and source alias. Never pass browser-supplied DTOs, records or receipts.
export function withEditorialAnnotations({ readReader, readSnapshot, siteId }) {
  return async request => {
    const dto = await readReader(request);
    if (!dto?.article) return dto;
    // Keep established article data, while omitting legacy editorial metadata.
    const { slug, title, category, sections, links } = dto.article;
    const article = { slug, title, category, sections, links };
    let legacy = [], next = [];
    try {
      if (label(siteId, 200) && dto.status === 'ready' && slug === request?.slug &&
          matches(slug, ALIAS) && Object.hasOwn(MAXIMUM, request.campaign) &&
          episode(request.episode, MAXIMUM[request.campaign]) &&
          request.episode === dto.selectedEpisode && dto.entries?.some(e => e.slug === slug)) {
        const scope = { siteId, campaign: request.campaign, source: slug };
        legacy = legacyLinks(dto, request);
        next = project({ ...dto, article }, request, await readSnapshot(scope), siteId)?.items ?? [];
      }
    } catch {
      // A private store outage leaves the base reader usable.
    }
    // Existing grants win conflicts without widening either approval's scope.
    const items = [...legacy, ...next.filter(item => item.kind !== 'link' ||
      !legacy.some(old => overlaps(old, item)))];
    const withinBudget = items.length <= 500 &&
      Buffer.byteLength(JSON.stringify(presentation(request, items)), 'utf8') <= 32768;
    const selected = withinBudget ? items : legacy;
    return { ...dto, article: selected.length ?
      { ...article, annotations: presentation(request, selected) } : article };
  };
}

// A disabled or differently scoped release retains the exact legacy contract.
export function selectEditorialReader({ contextualReader, deploymentSiteId, config, readSnapshot }) {
  return config?.enabled === true && label(deploymentSiteId, 200) && config.siteId === deploymentSiteId
    ? withEditorialAnnotations({ readReader: contextualReader, siteId: deploymentSiteId, readSnapshot })
    : contextualReader;
}
