import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { Worker } from 'node:worker_threads';

import { DepositMarkOcrPool } from './deposit-mark-ocr';

const IMAGE_BASE64 = Buffer.from('test image').toString('base64');

class FakeWorker extends EventEmitter {
  readonly messages: Array<{ id: number }> = [];
  terminated = false;
  refs = 0;
  unrefs = 0;
  private finishTermination?: (code: number) => void;

  constructor(private readonly deferTermination = false) {
    super();
  }

  unref() {
    this.unrefs += 1;
    return this;
  }

  ref() {
    this.refs += 1;
    return this;
  }

  postMessage(message: { id: number }) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
    if (!this.deferTermination) return Promise.resolve(1);
    return new Promise<number>((resolve) => {
      this.finishTermination = resolve;
    });
  }

  completeTermination() {
    this.finishTermination?.(1);
  }
}

function makePool(
  workers: FakeWorker[],
  createWorker: (index: number) => FakeWorker = () => new FakeWorker(),
  maximumQueuedRequests = 2,
) {
  return new DepositMarkOcrPool({
    workerCount: 1,
    maximumQueuedRequests,
    workerFactory: () => {
      const worker = createWorker(workers.length);
      workers.push(worker);
      return worker as unknown as Worker;
    },
  });
}

async function nextTurn() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function runTest(name: string, test: () => Promise<void>) {
  await test();
  console.log(`PASS ${name}`);
}

async function main() {
  await runTest('aborting queued OCR removes it before worker execution', async () => {
    const workers: FakeWorker[] = [];
    const pool = makePool(workers);
    const queuedController = new AbortController();

    const active = pool.read(IMAGE_BASE64, null);
    const queued = pool.read(IMAGE_BASE64, null, queuedController.signal);
    const queuedRejected = assert.rejects(queued, /Deposit Mark OCR aborted/);
    queuedController.abort();
    await queuedRejected;

    assert.equal(workers.length, 1);
    assert.equal(workers[0]?.messages.length, 1);
    const activeId = workers[0]?.messages[0]?.id;
    workers[0]?.emit('message', { id: activeId, lines: [] });
    await active;
    assert.equal(workers[0]?.messages.length, 1);
    assert.equal(workers[0]?.refs, 1);
    assert.equal(workers[0]?.unrefs, 1);
  });

  await runTest('aborting active OCR terminates its worker before dispatching queued work', async () => {
    const workers: FakeWorker[] = [];
    const pool = makePool(
      workers,
      (index) => new FakeWorker(index === 0),
    );
    const activeController = new AbortController();

    const active = pool.read(IMAGE_BASE64, null, activeController.signal);
    const activeRejected = assert.rejects(active, /Deposit Mark OCR aborted/);
    const queued = pool.read(IMAGE_BASE64, null);
    activeController.abort();
    await activeRejected;

    assert.equal(workers[0]?.terminated, true);
    assert.equal(workers.length, 1, 'replacement must wait for worker termination');
    workers[0]?.completeTermination();
    await nextTurn();

    assert.equal(workers.length, 2);
    assert.equal(workers[1]?.messages.length, 1);
    const queuedId = workers[1]?.messages[0]?.id;
    workers[1]?.emit('message', { id: queuedId, lines: [] });
    await queued;
  });

  await runTest('OCR queue rejects work beyond its fixed capacity', async () => {
    const workers: FakeWorker[] = [];
    const pool = makePool(workers, undefined, 1);

    const active = pool.read(IMAGE_BASE64, null);
    const queued = pool.read(IMAGE_BASE64, null);
    await assert.rejects(
      pool.read(IMAGE_BASE64, null),
      /Deposit Mark OCR is busy/,
    );

    const activeId = workers[0]?.messages[0]?.id;
    workers[0]?.emit('message', { id: activeId, lines: [] });
    await active;
    const queuedId = workers[0]?.messages[1]?.id;
    workers[0]?.emit('message', { id: queuedId, lines: [] });
    await queued;
  });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
