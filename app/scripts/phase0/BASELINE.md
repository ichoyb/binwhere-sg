# Classification baseline

This baseline answers two different questions. They must not be collapsed into one
green or red number.

## 1. Is the measurement valid?

A production baseline is valid, and prompt work may begin, only when all of these
conditions hold:

- the truth set has a version, human-review date, authoritative Singapore sources,
  and a SHA-256 digest in the result;
- descriptions contain the condition-changing fact, while deliberately missing
  BCRS evidence is labelled `not_sure` rather than guessed;
- all 41 real network-image sources match their pinned SHA-256 digests. Every
  submitted fixture then passes through the profile-specific Web client contract
  (auto-rotate, historical production at most 1024 px or candidate at most 2048 px,
  JPEG quality 70, white background) and the API's production sanitiser; no source
  bypasses either stage;
- image truth is assigned from the submitted pixels after that production image
  path. A source page proves provenance only: it cannot supply a mark, barcode,
  material or condition that the model could not see in the submitted image;
- an image-only `return_point` truth requires the official circular-arrow mark to
  be distinguishable as `10¢ SG RETURN` and a separate linear product barcode to
  be visibly present and unobscured on the same individual container. Barcode
  digits need not be decoded from the photo; the return point performs the final
  scan. The circular-arrow 10¢ shape or return-machine context alone cannot fill
  missing jurisdiction evidence. The
  [BCRS product-approval guide](https://bcrs.sg/files/2026-02-17_Phase_3_Product_Approval_Guide.pdf)
  distinguishes that barcode from a BCRS sticker's separate square 2D traceability
  code; the square code does not prove that the product barcode is visible.
  One angle with no readable mark proves only `not_sure`, never that the mark is
  absent;
- the evaluated request contract is the exact deployed revision recorded by the
  profile, including prompts, image instruction, model IDs, temperature, response
  schema, token and thinking controls, timeout/retry budget, semantic validation,
  and deterministic post-processing;
- model IDs, profile digest and timestamp are recorded; and
- the complete run has zero provider errors.

A valid production baseline is allowed to fail quality gates. A red baseline is a
measured defect to improve; it is not a reason to change labels until the score is
green. Any label correction requires source review and a new truth-set version.

## 2. Is a candidate eligible to deploy?

Run the frozen production profile and the candidate profile against the same
truth-set version close together in time. TokenHub model names are aliases rather
than immutable model builds, so an old result alone cannot separate prompt changes
from upstream model drift.

The candidate may proceed only when both runs are valid and all of these gates pass:

| Gate | Required state |
| --- | --- |
| Answerable text | exact, channel and status accuracy each >= 90% |
| Channel coverage | every expected channel >= 80% |
| Unnecessary abstention | `not_sure` on the answerable set < 15% |
| Unsafe diversion | zero safety-critical truths sent to any channel other than their reviewed expected channel; abstaining with `not_sure` remains safe but can fail the accuracy gates |
| Provider contract | zero provider errors |
| BCRS text invariants | every four-language text case passes exactly |
| BCRS image exactness | at least 95% of real-image cases pass exactly |
| BCRS refund recall | at least 90% of image cases with reviewed `return_point` truth are found |
| BCRS wrong direction | zero results sent to a wrong non-null channel; a safe `not_sure` is the only permitted image miss |
| BCRS holdout safety | every previously unused holdout passes all classification and next-action assertions, with zero provider error, wrong non-null channel, false refund direction or unknown-mark blue-bin leakage |
| False refund direction | zero non-eligible/unknown cases sent to `return_point` |
| Unknown-mark disposal | zero `not_sure` responses that mention a blue-bin channel before mark absence is established |

The BCRS thresholds are asymmetric on purpose. A false `return_point` or another
wrong disposal channel gives the user unsafe or false instructions and has zero
tolerance. An image-only `not_sure` retains unconfirmed eligibility. Identified beverage
containers can now receive a separate conditional `next_action`; that does not
change the classification truth. Image misses remain bounded by the 95%
image-exact and 90% refund-recall floors. This
prevents both dangerous guessing and a useless classifier that abstains on every
hard image. The thresholds must be frozen before selecting the next holdouts; an
already exposed holdout remains development evidence and cannot release the
candidate that was revised from it.

Passing the absolute gates is necessary but not enough to call a change better.
Compared with the same-day production-profile run, the candidate must not reduce
overall exact/channel/status accuracy, increase unnecessary `not_sure`, reduce any
channel's correct count, or turn any production-correct case into a wrong answer.
This monotonic gate prevents equal totals from hiding a harmful error swap.

Latency is recorded as p50/p95 diagnostic evidence, but is not promoted to a new
release threshold without a product latency target and repeated runs. Timeouts and
provider errors already fail the validity and release gates.

## Commands

```bash
cd app
npm run test:classify -- --profile=production
npm run test:classify:bcrs -- --profile=production
npm run test:classify -- --profile=candidate
npm run test:classify:bcrs -- --profile=candidate
```

The paid runners remain an explicit release decision; CI does not spend money or
depend on a live model. After both complete candidate runs pass, record their exact
result files as the evidence for the code being released:

```bash
npm run release-evidence:record -- \
  --text-result=scripts/phase0/results/classify-<timestamp>.json \
  --bcrs-result=scripts/phase0/results/bcrs-<timestamp>.json
npm run test:release-evidence
```

`release-evidence/current.json` is tracked and contains the complete per-case
candidate outputs, not only summary scores. The offline checker derives every gate
again and compares the candidate with the paired production baselines. It also
binds the evidence to the executable prompt/model/request profile, both truth-set
digests, the exact four-language deterministic post-processing strings, the Web +
server image-processing contract, and the locked Sharp version. A relevant change makes
CI fail until fresh paid results are explicitly reviewed and recorded; unrelated
application changes reuse the still-matching evidence. Do not hand-edit the
evidence file.

Production-profile results are tracked under `baselines/<truth-set>/<profile>.json`
only for a complete run. `--mode` and `--case` are diagnostics: they never evaluate
the release gate and never overwrite the canonical production baseline. Candidate
and exploratory runs remain under the gitignored `results/` directory. A candidate
run also requires a complete, zero-error production baseline with an exact profile
identity from the preceding 24 hours.

`sg-bcrs-v20` contains 60 exact assertions: 16 four-language text cases and 44
real-image cases drawn from the 41 sources above, including two current holdouts.
Before any model call, the runner compares the pixels produced by the complete
production image path and rejects any declared source pair with perceptual
similarity >= 0.995. This prevents one underlying photograph from appearing in
both regression and holdout partitions under different crops or publisher URLs.
The holdout cases and labels live in the developer-visible repository. They are a
frozen, non-adaptive check, not an independently sealed or blinded evaluation.

Version 16 promotes the exposed v15 holdouts to regression. The asymmetric image
gates above were frozen before the two previously unsubmitted v16 network images
were selected or sent to either profile. The new holdouts are a recent real video
frame where one bottle still shows a distinguishable `10¢ SG RETURN` mark and
linear product barcode after both production image stages, and a real return-machine
photo where the individual container is hidden inside the aperture. The latter is
`not_sure`: marks printed on the machine cannot prove the hidden container eligible.

Once a holdout has been evaluated, it is no longer unseen. If it is retained, the
next truth-set version promotes it to the regression partition and introduces a
new truth-labelled holdout before the next candidate run. A failed holdout may
guide the next candidate, but it cannot be reused as evidence that the revised
candidate generalises.


## 2026-09-19: action guidance (BCRS v17–v18)

The public response adds optional `next_action`. `channel`, `status`, confidence
and existing v1 prose keep their meanings. For an identified, potentially in-scope
single beverage container with unverified eligibility and no observed damage,
`try_return_point` recommends preparing it and scanning it on a future passing
visit, with an explicit unconfirmed-refund qualification. It does not promise a
refund or a blue bin beside a return point. Confirmed return classifications have
`return_container`. Other routing retains its existing behaviour.

Text and image evidence instructions are separate, in the same classification
call. Structured observations, not the translated item name or confidence score,
drive the shared action rule. The profile digest covers both prompts, observation
schema, action copy and the shared action implementation.

v17 adds four ordinary-water-bottle descriptions and two fresh real image
holdouts, bringing the suite to 16 text and 38 image cases (35 original images).
The v16 holdouts become regression cases. The two new holdouts are a front-facing
intact Evian plastic bottle with no visible barcode/SG mark, and a green glass
Mythos bottle. Both were reviewed after the Web and server JPEG processing path
before any paid model call. An initially proposed Kirkland photo was rejected
before model evaluation because visible shoulder dents made its damage truth
ambiguous. No generated images are used.

The first v17 candidate failed the unchanged release gate: 16/16 text and 35/38
images, with two wrong non-null channels and only one of two holdouts passing.
A label close-up was guessed to be a flexible coffee pouch, a standalone marketing
mark was mistaken for a mark on the bottle, and the glass holdout incorrectly
inherited the unknown-deposit rule. These truth labels were not changed.

The revised input instructions scope deposit uncertainty to plastic/metal drink
containers, distinguish visible physical packaging from brand lettering, and
require both mark and barcode on the container surface. v18 promotes both exposed
v17 holdouts to regression and adds two newly reviewed real photos: an intact
plastic Sprite bottle front and an open glass Sprite bottle. Both passed the
production image pipeline and pixel review before any model call. The suite now
has 16 text cases, 40 image cases and 37 original images. Explicit negative action
assertions also cover the established foreign mark, multiple subjects, outer
packaging and a hidden/unidentified container. No release threshold was relaxed.

Candidate assertions require trial actions for the unknown-mark and ordinary
water-bottle text cases and the new plastic-bottle holdout. Confirmed returns must
have the confirmed action, and known non-return channels must not gain a return
action. Every emitted action must retain the exact four-language application copy
including the refund qualification. Both new holdouts must pass their complete
classification and action assertions. Existing classification thresholds are
unchanged. Historical `production-0a5852f` calls intentionally have no next-action
output; their paired baseline measures the original classification contract.
This frozen historical profile is not the current live production revision; its
comparison is not a live-production A/B measurement.

Provider reasoning telemetry keeps reporting every nonzero reasoning count as a
contract violation. A separate `matchesRecordedBaseline` field identifies the
reviewed 2026-09-05 Kimi signature (one reasoning token, `finish=stop`). It is not a
health verdict; larger reasoning counts, other models or a truncated finish do
not match it. The required setting remains `thinking: {type:'disabled'}`.

The final v18 candidate remains **not release eligible**: answerable text passed
86/86; BCRS text passed 16/16 and images passed 38/40, including both fresh
holdouts and all 12 confirmed-return image positives. Two regression images went
to wrong non-null channels (a blurred mark to `return_point`, and a can-label
close-up to `general_waste`). The zero-wrong-channel gate therefore failed.
Recording the results was rejected by `release-evidence.ts`; the previous
`release-evidence/current.json` is deliberately unchanged and does not validate
these edits. Full Web `test:unit` remains blocked at that evidence check. No
threshold or reviewed truth label was weakened to obtain a green result.

## 2026-09-20: independent image evidence (BCRS v19–v20)

v19 promoted the v18 holdouts and froze a real marked-bottle positive plus a
multiple-imported-can safety photo. The candidate kept every zero-tolerance safety
metric at zero, passed all 16 text cases and 39/42 image cases, but reached only
11/13 confirmed-return positives and one of two holdouts. Its 92.9% image exactness
and 84.6% return recall remained below the unchanged 95% and 90% gates. Those
results were diagnostic only and were not recorded as release evidence.

The remaining positive misses shared one boundary: the primary classification
found the marked container, while a second probabilistic transcription could not
read the small `SG RETURN` letters reliably. Offline product-registry lookup is not
available, and a decoded EAN cannot prove scheme membership. The final candidate
therefore separates the two remaining facts: one constrained image-model call
checks only that a possible circular mark and a separate linear barcode are on the
same foreground container, while local PP-OCRv6 reads the submitted pixels for
literal `SG` and `RETURN` evidence. A confirmed return requires both checks to
agree with the primary container facts. Any disagreement remains an unconfirmed
action; OCR text or a barcode shape alone can never establish eligibility.

v20 promotes both exposed v19 images to regression and freezes two new real safety
photos before any model call: a Return Right machine beside a cart of bagged
bottles, and a supermarket display of many paper beverage cartons with visible
product barcodes. Both must remain `not_sure` with no return action. No unsuitable
photo was relabelled as a fresh positive; positive utility remains enforced by the
retained real-image positives and the 90% recall gate. The 41 source hashes and the
complete 1024px and 2048px processing paths pass the near-duplicate preflight; the
closest pair is about 0.91 against the 0.995 rejection limit.

The release candidate that shipped passed the complete paired evaluation. Core
text was 86/86 with no regression against production. BCRS was 59/60 overall:
text 16/16, images 43/44 (97.7%), confirmed-return recall 12/13 (92.3%), and fresh
holdouts 2/2. Wrong non-null channels, false `return_point`, uncertain blue-bin
mentions, and provider errors were all zero. The one miss was bounded and safe: a
marked bottle beside a receipt remained conditional instead of confirmed, so it
did not claim a wrong channel or refund. The unchanged 95% image and 90% recall
gates therefore passed. The complete results are recorded in
`release-evidence/current.json` against source-bound profile digest
`af69c1ad55c521479ec058a94a7ef1bab9774becfe78570f7954faa1bb6c3d98`.

This evidence shipped in `master` commit `1053b67` on 2026-09-21. Both the
independent Web CI and the production build/SSM deployment completed successfully;
post-deploy text and image requests returned the conditional `try_return_point`
action while preserving `channel=null` for unconfirmed eligibility.

The route experiments behind the 2026-09-19 and 2026-09-20 entries (scripts,
frozen plans and research notes) were removed from the working tree after this
release. Restore them from the same commit:
`git show 1053b67:app/scripts/phase0/image-routes/` lists the scripts, and the
notes are `docs/research/2026-09-19-image-action-routes.md` and
`docs/research/2026-09-20-image-action-experiments.md`.
