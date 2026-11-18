# Kyranda Codex Phase 2 review candidate

**NO-GO for Wix Test Site installation.** The candidate is ready for code review. Compare the archived Wix source against the current revision-799 exports, verify the controller passes the new payload unchanged, and reconcile any active legacy contextual grants before scheduling staging. Get separate owner authorization for staging and for the exact records to be staged.

## What changed

The new iframe release is [reader.html](../releases/citations-context-rc-20261117/reader.html). This repository's stable and pilot releases remain byte-for-byte intact. The manifest and index still point to their prior assets. To see the exact reader delta, run from the repository root:

```sh
git diff --no-index -- releases/infobox-responsive-20261117/reader.html releases/citations-context-rc-20261117/reader.html
```

The release retains the existing iframe transport, navigation, selection, history, height reporting, search, categories, related articles and infoboxes. Numbered citations appear in reading order at the end of their anchored paragraph. Each button expands a separate detail below the paragraph, leaving adjacent markers in the same group. Contextual links use the established route and carry the current campaign and episode. The reader uses text nodes and approved-alias URLs. It never infers a relationship from an article title.

## Trusted-side contract

The reviewed Wix exports show a public wrapper that calls a validated reader integration. That integration uses the unified route gateway. The gateway checks site identity, frozen release integrity, owner release approvals, the campaign alias manifest and current visibility. For an article request it supplies the full eligible directory, even if the UI has a search or category filter. The archived contextual reader decorates that validated result. Its projector requires independently reviewed occurrences, frozen identities, current availability and original anchor provenance. It emits a legacy grant envelope with review identifiers. The archived host forwards response envelopes through the existing iframe bridge.

This candidate preserves the gateway as the source of article and target eligibility. Phase 2 runs after the final DTO validation, at the existing decoration point documented in [the Wix wrapper patch](wix-wrapper.reference.patch). The new projector receives that filtered article and directory plus a site-scoped private snapshot for the current source. It projects only positions, citation display fields and eligible target aliases. The public annotation envelope binds the payload to the current source, campaign and selected episode. The reader applies additional shape, range and visible-target checks.

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

1. Export and compare the exact current `backend/codexUnifiedPublic.web.js`, `backend/codexUnifiedGateway.js`, `backend/codexPublicReaderIntegration.js`, three `backend/codexContextualLinks*.js` modules and `Public/custom-elements/codex-context-production-host.js`, plus the current page controller that handles the read RPC. The reviewed copies were archived before revision 799. The host in that archive pins an older reader URL. The current controller and exact deployed copies were unavailable. Assess the controller and any response cache. Confirm the actual stable Wix URL and capture the existing test deployment reference and draft code before staging.
2. Inventory active legacy contextual links. The new reader consumes only the receipt-free annotations DTO. Preserve existing approval history in its original location and migrate each still-active grant only after explicit verification of deployment scope, exact occurrence and visibility. Do not turn archived or pilot fixtures into active grants.
3. Prepare a separately approved staging artifact whose reader bytes match the PR. Use a dedicated immutable URL for staging, without changing the stable or pilot asset. Install the two new `codexEditorialAnnotation*.js` files under Backend only. Reconcile the reference wrapper patch against the exported wrapper and preserve its existing permissions, route calls and neutral fallbacks. Keep the private gate disabled until the site-scoped staging snapshot has separate approval. Use an isolated staging slot or reproduce the existing test surface independently if the available Wix deployment action would replace the pilot before permission is obtained.
4. Under separate staging authorization, configure the eligible staging site and activate the private gate for the reviewed staging snapshot. Set only the staging host URL to the candidate. Verify anonymous web and iframe responses for both campaigns at low and high clearance and verify missing, revoked, stale and malformed grants. Confirm earlier clearances and direct restricted alias requests omit restricted identities and annotation data. Check the response bytes for private approval material. Test with the actual Wix host for mobile and desktop layout, expansion and collapse, Back and Forward, selection persistence, title and infobox rendering, search, directory navigation, foreground resize, article scroll, and one scrollbar.
5. Review the result before considering production. Keep the production release 799 and its exposure outside this staging change.

### Rollback

If a later approved staging deployment fails, disable the Phase 2 gate immediately and restore the staging host and wrapper from the exact pre-install copies. For return to the already pinned stable reader, restore the `READER_URL` in the staging copy of `Public/custom-elements/codex-context-production-host.js` to `https://maximumtravis.github.io/kyranda-reader-assets/releases/infobox-responsive-20261117/reader.html` and restore the pre-install `getUnifiedPublicReader` delegation. If the staging rollback is to the existing Episode 1 pilot, restore the captured pilot URL and deployment only in that test slot. Verify freshly fetched reader bytes and a fresh episode-scoped response. Keep new private modules disabled and retain all editorial grants and revocation history. No CMS, permission or article edits are part of rollback. Switching a Wix deployment requires the corresponding separate authorization.

## Automated checks

```sh
node --test phase2/authorization.test.mjs
CHROMIUM_PATH=/path/to/chromium node --test phase2/reader.test.mjs
```

The Chromium suite uses Playwright with a local parent and the actual release HTML. Wix-specific RPC transport, network responses, installation, cache invalidation and page reflow still require the staging checks above.

Observed results on Nov 17, 2026 (Central time)

- Authorization and integrity suite passed all 16 tests.
- Headless Chromium passed both iframe suites at 1280 px and 320 px, including citation expansion and stable marker layout, navigation history, campaign and episode persistence, search, category filtering, infobox rendering, iframe growth and shrinkage, and a single outer scrollbar.
- Episode 1 source check passed with the supplied article exports and Apple Podcasts transcript. The current production DTO bytes and Patreon playback were outside this offline check.
