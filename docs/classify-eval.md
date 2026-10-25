# Classification evaluation and release evidence

The truth sets, paid runners, production baselines and the offline release-evidence
checker live in `app/scripts/classify-eval/`. The baseline answers two different
questions. They must not be collapsed into one green or red number.

## 1. Is the measurement valid?

A production baseline is valid, and prompt work may begin, only when all of these
conditions hold:

- the truth set has a version, human-review date, authoritative Singapore sources,
  and a SHA-256 digest in the result;
- descriptions contain the condition-changing fact, while deliberately missing
  BCRS evidence is labelled `not_sure` rather than guessed;
- every real network-image source matches its pinned SHA-256 digest. Every
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

## Commands and evidence files

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
  --text-result=scripts/classify-eval/results/classify-<timestamp>.json \
  --bcrs-result=scripts/classify-eval/results/bcrs-<timestamp>.json
npm run test:release-evidence
```

`app/scripts/classify-eval/release-evidence/current.json` is tracked and contains
the complete per-case candidate outputs, not only summary scores. The offline checker
derives every gate again and compares the candidate with the paired production
baselines. It also binds the evidence to the executable prompt/model/request profile,
both truth-set digests, the exact four-language deterministic post-processing
strings, the Web + server image-processing contract, and the locked Sharp version. A
relevant change makes CI fail until fresh paid results are explicitly reviewed and
recorded; unrelated application changes reuse the still-matching evidence. Do not
hand-edit the evidence file.

The bound source files are hashed by content under logical names, not by path. A
documentation change or a file move therefore never needs a paid run; relocating a
bound source file only needs its path updated in `baseline-profiles.ts`.

Production-profile results are tracked under `baselines/<truth-set>/<profile>.json`
only for a complete run, and only for the current truth-set version; delete the
superseded directory when the truth set gets a new version (Git keeps it). `--mode`
and `--case` are diagnostics: they never evaluate the release gate and never
overwrite the canonical production baseline. Candidate and exploratory runs remain
under the gitignored `results/` directory. A candidate run also requires a complete,
zero-error production baseline with an exact profile identity from the preceding
24 hours.

The `production` profile is a frozen revision named by its commit
(`PRODUCTION_PROFILE.id` in `baseline-profiles.ts`), not necessarily the live one.
The paired comparison measures the candidate against that frozen contract, not a
live-production A/B. A profile frozen before `next_action` existed has no action
output, so action assertions apply to the candidate only.

## Truth sets and holdouts

Before any model call, the runner compares the pixels produced by the complete
production image path and rejects any declared source pair with perceptual
similarity >= 0.995. This prevents one underlying photograph from appearing in
both regression and holdout partitions under different crops or publisher URLs.
The holdout cases and labels live in the developer-visible repository. They are a
frozen, non-adaptive check, not an independently sealed or blinded evaluation.

Once a holdout has been evaluated, it is no longer unseen. If it is retained, the
next truth-set version promotes it to the regression partition and introduces a
new truth-labelled holdout before the next candidate run. A failed holdout may
guide the next candidate, but it cannot be reused as evidence that the revised
candidate generalises.

## Image fixtures

Image cases use real photographs published on the web, never generated or synthetic
images. `bcrs-test-cases.ts` records each source's page, credit, licence or usage
boundary, review date and SHA-256 digest. The runner downloads the bytes into the
gitignored `fixtures/cache/` and verifies the digest; a changed remote file fails the
gate until it is reviewed and its digest updated. An optional `crop` rectangle in the
manifest represents how a user frames a close-up; it is applied deterministically to
the real source photograph, never generated content.

Sources marked `Publisher-owned; evaluation cache only` (ST, CNA, Mothership) must never
be committed or redistributed by this repository. Wikimedia sources keep their
attribution and licence metadata in the manifest, although their bytes also stay out
of Git.

Human review establishes the expected answer. A filename, article caption, URL,
receipt charge, ordinary recycling symbol or foreign deposit scheme is never model
input and never proof of Singapore BCRS eligibility. The eligibility rule itself is
pinned separately in the manifest to NEA's BCRS consumer guidance and BCRS's
product-approval guide, with its own human-review date. Regression images may explain
a known defect and so may influence prompt changes; holdout images are first
evaluated only after a candidate is frozen.

## Deposit Mark OCR models

`app/ocr/models/` holds the Apache-2.0 PP-OCRv6 small detection and recognition
models distributed by RapidOCR 3.9.2 (source manifest: `rapidocr/default_models.yaml`
in RapidOCR 3.9.2). They only verify the literal `SG` and `RETURN` text in a possible
Singapore Deposit Mark, and cannot confirm a refund by themselves: the application
also requires eligible primary container facts plus a possible mark and a separate
linear product barcode associated with the same foreground container. The release
evidence binds the worker, dictionary, both model digests and the calling policy;
`npm run package:web` runs a real inference through the packaged worker.

| File | SHA-256 |
| --- | --- |
| `PP-OCRv6_det_small.onnx` | `090f04abcd9d9a7498bc4ebf677e4cb9bdce1fe4197ddb7e529f1ef44e1ff94f` |
| `PP-OCRv6_rec_small.onnx` | `6f327246b50388f3c176ae304bd95767ea6dc0c9ae92153ef8cbe210b3c14884` |
| `ppocrv6_dict.txt` | `f7aa897ca828a4c7c9e2739c30f9161a33306d532f020bcdb91dcfb664a5507e` |

Model project: <https://github.com/PaddlePaddle/PaddleOCR>. Runtime distributor:
<https://github.com/RapidAI/RapidOCR>.
