// Install as Backend-private. This review copy contains no real records or receipts.
// Set a pinned site identity and activation switch only under a separate authorization.
export const editorialAnnotationConfig = Object.freeze({ enabled: false, siteId: null });

// Site-scoped deployment snapshot. A reviewed release supplies whole per-source
// snapshots atomically. Keep review history and private evidence in the editorial store.
const snapshots = Object.freeze({});

export async function readEditorialAnnotationSnapshot({ siteId, campaign, source }) {
  if (!editorialAnnotationConfig.enabled || siteId !== editorialAnnotationConfig.siteId) return null;
  const key = campaign + '/' + source;
  return Object.hasOwn(snapshots, key) ? snapshots[key] : null;
}
