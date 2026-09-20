import { join } from 'node:path';
import { Worker } from 'node:worker_threads';

import { z } from 'zod';

export const NormalizedImageRegionSchema = z.object({
  left: z.number().min(0).max(1),
  top: z.number().min(0).max(1),
  width: z.number().min(0.01).max(1),
  height: z.number().min(0.01).max(1),
});

export type NormalizedImageRegion = z.infer<typeof NormalizedImageRegionSchema>;

export interface DepositMarkOcrLine {
  text: string;
  confidence: number;
  source: 'full' | 'mark_region' | 'mark_crop';
}

export interface DepositMarkOcrResult {
  lines: DepositMarkOcrLine[];
  hasSingaporeMarkText: boolean;
}

export const DEPOSIT_MARK_OCR_CONTRACT = {
  version: 4,
  detector: 'PP-OCRv6_det_small',
  recognizer: 'PP-OCRv6_rec_small',
  minimumConfidence: 0.15,
  minimumMarkRegionIou: 0.2,
  workerCount: 2,
  maximumQueuedRequests: 2,
} as const;

function compactOcrText(text: string) {
  return text.normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function editDistanceAtMostOne(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1;
}

/** Require literal OCR evidence for both jurisdiction and action words. */
export function hasDeterministicSingaporeMarkText(lines: Array<
  Pick<DepositMarkOcrLine, 'text'>
  & Partial<Pick<DepositMarkOcrLine, 'confidence' | 'source'>>
>) {
  // Whole-image OCR is useful for diagnostics, but cannot prove that words seen
  // elsewhere on a label belong to the possible Deposit Mark. Only detected
  // text boxes or direct recognition strips inside that region can confirm it.
  const text = lines
    .filter((line) => line.source === 'mark_region' || line.source === 'mark_crop')
    .map((line) => ({ ...line, compact: compactOcrText(line.text) }));
  const hasSg = text.some(({ compact, confidence, source }) => (
    compact === 'SG'
    || compact.includes('INSGONLY')
    || (source === 'mark_crop' && (confidence ?? 0) >= 0.8 && compact === 'SO')
  ));
  const hasReturn = text.some(({ compact, confidence, source }) => (
    compact === 'RETURN'
    || (source === 'mark_crop'
      && (confidence ?? 0) >= 0.65
      && editDistanceAtMostOne(compact, 'RETURN'))
  ));
  return hasSg && hasReturn;
}

/** Require the classifier and the independent locator to point at the same mark. */
export function markRegionsMatch(
  first: NormalizedImageRegion | null,
  second: NormalizedImageRegion | null,
) {
  if (!first || !second) return false;
  const left = Math.max(first.left, second.left);
  const top = Math.max(first.top, second.top);
  const right = Math.min(first.left + first.width, second.left + second.width);
  const bottom = Math.min(first.top + first.height, second.top + second.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = first.width * first.height + second.width * second.height - intersection;
  return union > 0 && intersection / union >= DEPOSIT_MARK_OCR_CONTRACT.minimumMarkRegionIou;
}

interface OcrWorkerMessage {
  id: number;
  lines?: DepositMarkOcrLine[];
  error?: string;
}

interface OcrJob {
  id: number;
  imageBytes: Uint8Array<ArrayBuffer>;
  region: NormalizedImageRegion | null;
  resolve: (result: DepositMarkOcrResult) => void;
  reject: (error: Error) => void;
  removeAbortListener: () => void;
  state: 'queued' | 'active' | 'settled';
  slot?: OcrWorkerSlot;
}

interface OcrWorkerSlot {
  worker?: Worker;
  active?: OcrJob;
  restarting: boolean;
}

export interface DepositMarkOcrPoolOptions {
  workerCount?: number;
  maximumQueuedRequests?: number;
  workerFactory?: () => Worker;
}

/**
 * Bound OCR work to the CPU available on the production host.
 *
 * A request is sent to a worker only when that worker is idle. Aborting an active
 * request terminates its worker because ONNX inference is synchronous inside the
 * worker and cannot be interrupted by another message. This prevents a timed-out
 * attempt from continuing to consume CPU while its retry waits behind it.
 */
export class DepositMarkOcrPool {
  private readonly slots: OcrWorkerSlot[] = [];
  private readonly waiting: OcrJob[] = [];
  private requestId = 0;
  private readonly workerCount: number;
  private readonly maximumQueuedRequests: number;
  private readonly workerFactory: () => Worker;

  constructor(options: DepositMarkOcrPoolOptions = {}) {
    this.workerCount = options.workerCount ?? DEPOSIT_MARK_OCR_CONTRACT.workerCount;
    this.maximumQueuedRequests = options.maximumQueuedRequests
      ?? DEPOSIT_MARK_OCR_CONTRACT.maximumQueuedRequests;
    this.workerFactory = options.workerFactory
      ?? (() => new Worker(join(process.cwd(), 'ocr', 'deposit-mark-worker.mjs')));

    if (!Number.isInteger(this.workerCount) || this.workerCount < 1) {
      throw new Error('Deposit Mark OCR workerCount must be a positive integer');
    }
    if (!Number.isInteger(this.maximumQueuedRequests) || this.maximumQueuedRequests < 0) {
      throw new Error('Deposit Mark OCR maximumQueuedRequests must be a non-negative integer');
    }
  }

  read(
    imageBase64: string,
    region: NormalizedImageRegion | null,
    signal?: AbortSignal,
  ): Promise<DepositMarkOcrResult> {
    if (signal?.aborted) return Promise.reject(new Error('Deposit Mark OCR aborted'));

    const hasIdleSlot = this.slots.some((slot) => !slot.active && !slot.restarting);
    const canCreateSlot = this.slots.length < this.workerCount;
    if (!hasIdleSlot && !canCreateSlot && this.waiting.length >= this.maximumQueuedRequests) {
      return Promise.reject(new Error('Deposit Mark OCR is busy'));
    }

    const id = ++this.requestId;
    const imageBytes = Uint8Array.from(Buffer.from(imageBase64, 'base64'));
    return new Promise((resolve, reject) => {
      const job: OcrJob = {
        id,
        imageBytes,
        region,
        resolve,
        reject,
        removeAbortListener: () => signal?.removeEventListener('abort', onAbort),
        state: 'queued',
      };
      const onAbort = () => this.abort(job);
      signal?.addEventListener('abort', onAbort, { once: true });
      this.waiting.push(job);
      this.dispatch();
    });
  }

  private dispatch() {
    while (this.waiting.length > 0) {
      let slot = this.slots.find((candidate) => !candidate.active && !candidate.restarting);
      if (!slot && this.slots.length < this.workerCount) {
        slot = { restarting: false };
        this.slots.push(slot);
      }
      if (!slot) break;

      const job = this.waiting.shift();
      if (!job || job.state !== 'queued') continue;

      slot.active = job;
      job.slot = slot;
      job.state = 'active';

      try {
        const worker = slot.worker ?? this.startWorker(slot);
        worker.ref();
        worker.postMessage(
          { id: job.id, imageBytes: job.imageBytes.buffer, region: job.region },
          [job.imageBytes.buffer],
        );
      } catch (error) {
        slot.active = undefined;
        job.slot = undefined;
        this.reject(job, new Error(
          `Deposit Mark OCR worker failed: ${error instanceof Error ? error.message : String(error)}`,
        ));
      }
    }

    for (const slot of this.slots) {
      if (slot.worker && !slot.active && !slot.restarting) slot.worker.unref();
    }
  }

  private startWorker(slot: OcrWorkerSlot) {
    const worker = this.workerFactory();
    slot.worker = worker;
    worker.on('message', (message: OcrWorkerMessage) => {
      if (slot.worker !== worker) return;
      const job = slot.active;
      if (!job || message.id !== job.id) {
        this.retireWorker(slot, worker, new Error('Deposit Mark OCR worker returned an unexpected response'));
        return;
      }

      slot.active = undefined;
      job.slot = undefined;
      if (message.error) {
        this.reject(job, new Error(`Deposit Mark OCR failed: ${message.error}`));
      } else {
        const lines = message.lines ?? [];
        this.resolve(job, {
          lines,
          hasSingaporeMarkText: hasDeterministicSingaporeMarkText(lines),
        });
      }
      this.dispatch();
    });
    worker.on('error', (error) => {
      if (slot.worker !== worker) return;
      this.retireWorker(
        slot,
        worker,
        new Error(`Deposit Mark OCR worker failed: ${error.message}`),
      );
    });
    worker.on('exit', (code) => {
      if (slot.worker !== worker) return;
      slot.worker = undefined;
      const job = slot.active;
      slot.active = undefined;
      if (job) {
        job.slot = undefined;
        this.reject(job, new Error(`Deposit Mark OCR worker exited with code ${code}`));
      }
      this.dispatch();
    });
    return worker;
  }

  private abort(job: OcrJob) {
    if (job.state === 'settled') return;

    if (job.state === 'queued') {
      const index = this.waiting.indexOf(job);
      if (index >= 0) this.waiting.splice(index, 1);
      this.reject(job, new Error('Deposit Mark OCR aborted'));
      return;
    }

    const slot = job.slot;
    if (!slot || slot.active !== job) return;
    slot.active = undefined;
    job.slot = undefined;
    this.reject(job, new Error('Deposit Mark OCR aborted'));

    const worker = slot.worker;
    if (!worker) {
      this.dispatch();
      return;
    }
    this.restartWorker(slot, worker);
  }

  private retireWorker(slot: OcrWorkerSlot, worker: Worker, error: Error) {
    if (slot.worker !== worker) return;
    slot.worker = undefined;
    const job = slot.active;
    slot.active = undefined;
    if (job) {
      job.slot = undefined;
      this.reject(job, error);
    }
    this.restartWorker(slot, worker);
  }

  private restartWorker(slot: OcrWorkerSlot, worker: Worker) {
    slot.worker = undefined;
    slot.restarting = true;
    worker.removeAllListeners();
    void worker.terminate()
      .catch(() => undefined)
      .finally(() => {
        slot.restarting = false;
        this.dispatch();
      });
  }

  private resolve(job: OcrJob, result: DepositMarkOcrResult) {
    if (job.state === 'settled') return;
    job.state = 'settled';
    job.removeAbortListener();
    job.resolve(result);
  }

  private reject(job: OcrJob, error: Error) {
    if (job.state === 'settled') return;
    job.state = 'settled';
    job.removeAbortListener();
    job.reject(error);
  }
}

const ocrPool = new DepositMarkOcrPool();

export function readDepositMarkText(
  imageBase64: string,
  region: NormalizedImageRegion | null,
  signal?: AbortSignal,
): Promise<DepositMarkOcrResult> {
  return ocrPool.read(imageBase64, region, signal);
}
