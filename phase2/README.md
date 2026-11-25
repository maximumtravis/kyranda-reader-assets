# Kyranda Codex Phase 2 review candidate

**NO-GO for Wix Test Site installation.** The current wrapper and controller are reconciled. The reconnect correction is ready for review, and the owner confirmed the published legacy-link baseline. Reserve an isolated staging surface that preserves the Episode 1 pilot, then obtain separate authorization for the staging deployment and its records.

## What changed

The new iframe release is [reader.html](../releases/citations-context-rc-20261117/reader.html). This repository's stable and pilot releases remain byte-for-byte intact. The manifest and index still point to their prior assets. To see the exact reader delta, run from the repository root:

```sh
git diff --no-index -- releases/infobox-responsive-20261117/reader.html releases/citations-context-rc-20261117/reader.html
```

The release retains the existing iframe transport, navigation, selection, history, height reporting, search, categories, related articles and infoboxes. Numbered citations appear in reading order at the end of their anchored paragraph. Each button expands a separate detail below the paragraph, leaving adjacent markers in the same group. Contextual links use the established route and carry the current campaign and episode. The reader uses text nodes and approved-alias URLs. It never infers a relationship from an article title.

## Trusted-side contract

### Revision 799 export compatibility

The eight export files supplied for this review represent the Wix Editor source. They establish source behavior. The owner confirmed the published link is clickable at Parental 3 and absent at Parental 1.

| Wix file | Decision | Reason |
| --- | --- | --- |
| `backend/codexUnifiedPublic.web.js` | Requires changes | The actual legacy decorator is enabled in production scope. Apply the reconciled patch only to the reader endpoint and keep the existing endpoint gates, route and presentation delegates. |
| `backend/codexUnifiedGateway.js` | Compatible | Verifies active runtime site, owner release gates and frozen integrity, alias manifest, campaign and episode, DTO allowlists and complete eligible directory before producing an article. |
| `backend/codexPublicReaderIntegration.js` | Compatible | Accepts only campaign, episode, search, category and slug; emits ready status, episode bounds, entries, categories and a validated article containing slug, title, category, heading/text sections and visible related links. Extra article fields are discarded here. Decoration must follow this step. |
| `backend/codexContextualLinksReader.js` | Compatible | Applies the existing owner cutover and review gates after the trusted integration; resolves frozen identities against the eligible directory and verifies the eligible section. |
| `backend/codexContextualLinksProjector.js` | Compatible | Checks the private scoped receipt, target/current title, exact text hash, protected ranges, unique context match and overlap before emitting exact spans. The composition translates only its approved output. |
| `backend/codexContextualLinksApprovalData.js` | Compatible | Existing review and owner cutover data stay in place. No history or grant flags change. |
| `Public/custom-elements/codex-context-production-host.js` | Compatible | Export pins the stable reader. A staging copy needs only the candidate URL change. It validates the current iframe/source, bridge token, connection, session, serial, revision and sizing messages and forwards the response envelope unchanged. It creates a new frame on reconnection and keeps initialization/sync messages for recovery. |
| `codexprotected-page` page controller | Compatible | Browser-only protected delivery, Wix location and authorized semantic routing, campaign/episode preferences, and original route writes remain intact. The read action sends the five expected keys. Presentation is a separate RPC. The controller passes `value` intact and checks revision/context and intent around asynchronous reads. Location synchronization clears the old iframe view and reinitializes it when Wix restores history. A fresh bridge increments revision and drops outstanding old reads. |

### Legacy links and the enabled wrapper

Use [the reconciled wrapper patch](wix-wrapper.reference.patch) after the trusted validators and the current legacy decorator. The gate off path returns the existing decorator unchanged, with the existing reader URL. The gate on path calls that same decorator on every request, converts its validated exact spans to presentation-only links and strips the old envelope. Phase 2 records still need their own grants. Existing approved spans win overlaps and independent nonoverlapping spans can coexist. The Phase 2 module has an empty store by default and never sources records from the pilot or archive. Existing links do not require migration or a duplicate grant.

Eric the Cleric → C-Smooth is scoped to Parental Advisory Episode 3 and the second occurrence. The legacy code requires both the independent editorial review and the separate matching production cutover authorization. It explicitly selects the offline-scope grant with `deploymentAuthorized === false`; this flag does not veto the separately scoped cutover. The additional staging/publication flags on that editorial record are not runtime predicates. The actual projector checks frozen source/target identity, their current visibility, the section hash and anchor provenance, plus the reviewed prefix and suffix that select the second occurrence. The current exports satisfy the configuration gates. An offline replay with the archived frozen data projected only the second occurrence at Episode 3 and none at Episode 1. The owner subsequently confirmed the published clickability at Episode 3 and omission at Episode 1. That observation and the offline exact-occurrence check are separate evidence. Preserve the original data and review history without widening clearance or scope.

### Cache and revocation

The backend wrapper and projection do not memoize responses. A deployed change to either private grant snapshot reaches a fresh uncached read after the applicable Wix release changes. This is not a promise that content already delivered to a browser disappears. The page controller memoizes initial route resolution, not article reader responses. The current host retains initialization and synchronization metadata, not article replies. The iframe holds the current presentation in memory and clears it while processing a route revision. Back/Forward synchronized to a new revision and a fresh iframe initialization request the content again. A same-location screen already displaying annotations may retain them until fresh read, refresh or navigation; previous public copies cannot be recalled.

The current content port JSON-serializes full envelopes. During the interval between a new connection's offer and acknowledgment, it previously queued an old RPC response. On acknowledgment, it replayed initialization and drained that queue before signaling controller readiness. The fresh iframe restarted its request IDs at 1, so it could accept the old reply before processing the controller's higher-revision sync. [The reconnect patch](wix-content-port-reconnect.patch) drops only RPC responses submitted while the bridge is unaccepted. The ready handshake, initialization/sync replay, and measurement queue retain their existing behavior. Once the connection is accepted, controller revision checks still govern async replies. Wix web-method/intermediary caching and the real Wix reconnect flow remain staging acceptance checks.

The [private snapshot schema](private-snapshot.schema.json) describes the stored records. Runtime invariants also require:

- Unique heading and exact section position, plus a SHA-256 digest of the JSON array containing the exact heading and rendered section text. Preserve whitespace and punctuation from the trusted DTO. New sections appended after a previously approved section leave that placement valid. Moving or altering the approved section requires review.
- One exact, case-sensitive occurrence within the reviewed section. Repetition, including overlapping occurrences in a section, withholds the annotation. Repetition in a separately identified section or the article introduction is allowed.
- Link provenance verified against the original body, with protected offsets for existing inline anchors or other protected text. Offsets are JavaScript UTF-16 code units with an exclusive end. An empty list means an editor confirmed the source body has no protected ranges. Conflicting links are withheld. Cross-campaign links are excluded because aliases come from the current campaign's filtered DTO.
- A separate approved receipt from the authoritative private snapshot. Its digest binds the entire ordered publication record, including the source, anchor, reveal, timestamp or target, and receipt ID. A hash detects edits. Authority comes from the protected snapshot and explicit owner review.
- A record must pass its minimum reveal episode and, for citations, the cited episode cannot exceed that reveal. Episode 1 approvals remain eligible at 47 when their section and grants still match. The existing campaign ceilings are 47 and 3.
- Use a deployment snapshot scoped by site, campaign and source. Keep historical receipts private. Publish current records and grants atomically. To revoke, replace the current scoped snapshot with a revoked record or grant and retain the former review in private history. Reuse neither an old grant nor an old release snapshot as a rollback mechanism for content. A reload checks the current deployment snapshot. Previously received data cannot be recalled.
- No relationship-specific endpoint. Directory, route, SEO and presentation endpoints keep their existing behavior. The annotation layer adds at most 32 KiB per article. Missing snapshots, private store failures, malformed data or an exceeded payload cap omit the optional annotations. Confirm the final RPC path has no shared response cache that can outlive revocation or mix campaign and episode requests.

The [private data module](codexEditorialAnnotationData.js) starts disabled with an empty store. It is a per-source static deployment snapshot, giving the existing frozen release workflow an atomic deployment unit. An editorial publishing tool or live store can supply the same snapshot interface if needed later. The release gate remains distinct from record-level grants.

## Episode 1 validation and repeatable intake

```sh
node phase2/check-episode1.mjs /private/episode1.vtt /private/Sestone.txt /private/Malcius.txt
```

The offline check found 10 Sestone and 8 Malcius placements and one Malcius-to-Sestone placement. The current source article exports are presentation text, so compare the canonical DTO bytes before issuing actual grants. Pending records projected zero items. Temporary fictional grants in process memory projected 18 citations and one link at both Episode 1 and Episode 47. The check located 24 supporting Apple transcript cue starts without copying transcript content.

The pilot times are the owner-checked approximate Patreon times. The Apple cue starts are evidence locators for review. In particular, S05's direct dock description starts at 21:02, S06's stables confirmation at 22:25, and S09's actual request at 40:51. The pilot markers for those claims are at 20:37, 22:15 and 40:31. S03 directly supports fair rule, while “respected” is interpretive. S08's character identification is confirmed in a later cue. Review whether to keep the start of each scene or move the citation to the direct evidence, then verify any revised time against the Patreon ad-free playback. No time or real record has been approved by this candidate.

For each next episode, privately parse the final transcript, store evidence cue ranges or IDs with the source edition, identify which article claim each cue supports, and compare with the current visible article DTO. Record only unique, exact anchors plus their section digests. Mark all candidates pending. Have an editor confirm wording, relationship provenance, spoiler clearance and approximate Patreon playback time before recording a grant. Deploy the authorized record and matching receipt together in the scoped snapshot. Reader changes are unnecessary for subsequent episodes.

## Wix Test Site installation after authorization

1. Save the exact current `public/codexContentPort.js` as a rollback copy and confirm it matches the reconnect patch context. Record the owner-confirmed baseline at Parental 3 and Parental 1. Capture the production release number/exposure and the existing Episode 1 pilot URL/deployment. Preserve release 799 and the current draft. If the production baseline differs, reconcile before staging.
2. Reserve a separate authorized staging surface or deployment that can retain the existing pilot. If Wix presents only a replacement of that Test Site, stop before replacing it. A separate site must already have its own valid site-scoped release and runtime gates; do not copy or override production authorizations to make the candidate run there.
3. In the isolated staging build add only `backend/codexEditorialAnnotations.js` and `backend/codexEditorialAnnotationData.js`. Apply [the wrapper patch](wix-wrapper.reference.patch) to the LF-normalized export of `backend/codexUnifiedPublic.web.js`; the existing legacy reader remains enabled. Leave the new gate off and the staging host on the prior reader for the baseline. Apply [the reconnect patch](wix-content-port-reconnect.patch) to the LF-normalized export of `public/codexContentPort.js` in the same isolated staging build. Preserve the gateway, reader integration, contextual modules and page controller.
4. Once authorized to stage, review the exact private snapshot per site/campaign/source. Require distinct editorial approvals for any new real links or citations and authorizations matching the staging target. Point the staging copy of `Public/custom-elements/codex-context-production-host.js` at a separately authorized immutable copy of `releases/citations-context-rc-20261117/reader.html`. Enable the gate with the matching staging deployment site ID in the same staging revision as the URL change. Never place snapshot data or receipts in Public files. Ship neither change independently: the stable reader needs the original legacy envelope and the candidate needs the receipt-free annotations DTO.
5. In fresh staging browser sessions check Main 1 and 47, Parental 1 and 3, exact legacy span preservation, both annotation types, missing and revoked grants, hidden and unknown aliases, cross-campaign targets and absence of private records in the delivered response. Hold a reply across URL change/reconnect and verify it cannot reappear or be matched to a fresh request. Verify Back/Forward, preferences, exact read payload, desktop/mobile widths, long/short resize and single scrollbar. Verify a new uncached request after a synthetic revocation resolves without the revoked data. Keep both public production and the existing pilot outside the deployment.

### Rollback

In an authorized rollback, restore the exact prior staging deployment. If reverting staging files, atomically restore the staging host to its captured prior URL (stable URL for a stable baseline), turn off the Phase 2 gate, restore the captured content port, and restore the original reader delegation to `contextualReader`. Its previously reviewed legacy behavior remains in effect. Leave the two new modules inert if retained. Check fresh response and frame bytes and the prior legacy scope. The existing pilot requires no rollback because installation uses a separate surface. Keep production, CMS permissions, records, receipts, and editorial history untouched.

## Automated checks

```sh
node --test phase2/authorization.test.mjs phase2/legacy.test.mjs
CHROMIUM_PATH=/path/to/chromium node --test phase2/reader.test.mjs
```

The Chromium suite uses Playwright with a local parent and the actual release HTML. Wix-specific RPC transport, network responses, installation, cache invalidation and page reflow still require the staging checks above.

Observed results on Nov 17, 2026 (Central time)

- Authorization and integrity suite passed all 16 tests.
- Headless Chromium passed both iframe suites at 1280 px and 320 px, including citation expansion and stable marker layout, navigation history, campaign and episode persistence, search, category filtering, infobox rendering, iframe growth and shrinkage, and a single outer scrollbar.
- Episode 1 source check passed with the supplied article exports and Apple Podcasts transcript. The current production DTO bytes and Patreon playback were outside this offline check.

### Revision 799 reconciliation results

- `CHROMIUM_PATH=/tmp/chromium node --test phase2/*.test.mjs`: 24 passed, 0 failed. This includes 16 original authorization tests, six legacy composition tests and both updated Chromium suites. Chromium confirmed that a rendered annotation remains until a refresh of content and disappears after Back/Forward triggers a fresh read following simulated revocation; reconnect then initializes from the current episode.
- Private offline replay of the exported legacy reader/projector and page controller passed. It checked the second-occurrence scope, Episode 1 omission, receipt stripping, forwarding of the annotation envelope and rejection of an outstanding result across a bridge revision. The private exports and replay inputs were excluded from the commit.
- Still open: authorization and isolated staging availability, and Wix-specific HTTP/RPC caching, reconnect and page reflow acceptance.

### Held-response regression using the current Wix export

Run with the privately saved owner export and Chromium:

```sh
CODEX_CONTENT_PORT=/path/to/codexContentPort.js CHROMIUM_PATH=/path/to/chromium   node --test phase2/*.test.mjs
```

The regression uses the actual exported ES module and the current release iframe. It runs both the untouched export and a temporary copy with the exact Wix patch applied. The test models the Wix element adapter and the controller's synchronous revision advance upon the second ready signal. It holds an Episode 47 selection reply until connection two has been offered, then lets the real iframe reuse ID 1. Before the patch, the response went out ahead of revision 1 and triggered a stale Episode 47 read. With the patch, that response is discarded and the revision 1 Episode 1 request renders normally. The owner export stays private. Without `CODEX_CONTENT_PORT`, the regression is explicitly skipped.
