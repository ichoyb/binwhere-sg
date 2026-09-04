# BCRS image regression fixtures

The live regression gate uses real photographs published on the web. It does not
use generated or synthetic images.

The `sg-bcrs-v16` source manifest lives in `../bcrs-test-cases.ts`. Its 33 sources
feed 36 image assertions. Every source records its page, credit, licence or usage
boundary, review date, and SHA-256 digest. The test runner downloads bytes into
`fixtures/cache/`, verifies the digest, applies the Web client contract (auto-rotate,
at most 1024 px, JPEG quality 70, white background), and then applies the API's
production sanitiser. A changed remote file fails the gate and must be reviewed
before its digest is updated.

Before any model request in a complete run, the runner compares the pixels after
both production image stages. If any declared source pair reaches 0.995 perceptual
similarity, the run fails. This catches the same underlying photograph even when
it appears under a different URL or crop and keeps regression and holdout evidence
independent.

An optional tracked crop represents how a user frames a close-up before upload; it
is a deterministic crop of the real source photograph, never generated content.

The cache is gitignored. In particular, publisher-owned CNA and Mothership images
must never be committed or redistributed by this repository. Wikimedia sources
retain their attribution and licence metadata in the manifest even though their
bytes are also kept out of Git.

Human review establishes the expected answer. A filename, article caption, URL,
receipt charge, ordinary recycling symbol, or foreign deposit scheme is never used
as model input or treated as proof of Singapore BCRS eligibility. The rule itself
is pinned separately in the manifest to NEA's current BCRS consumer guidance and
BCRS's product-approval guide, with its own human-review date. The approval guide
distinguishes the linear product barcode from the separate square 2D traceability
code.

The manifest separates regression images from holdout images. Regression images
may explain a known defect and can therefore influence prompt changes. Holdout
images are first evaluated only after a candidate is frozen; a failed holdout may
reject that candidate, but must not be used to tune and re-score the same candidate.
Because the manifest and labels are developer-visible, this is a frozen,
non-adaptive holdout rather than an independently sealed or blinded evaluation.
