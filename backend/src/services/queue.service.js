import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL;

export const isQueueEnabled = !!REDIS_URL;

let bookletQueue = null;
let bundleQueue = null;

const defaultJobOpts = {
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

if (isQueueEnabled) {
  const connection = { url: REDIS_URL };

  bookletQueue = new Queue("ai-booklet-evaluation", {
    connection,
    defaultJobOptions: {
      ...defaultJobOpts,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  });

  bundleQueue = new Queue("ai-bundle-evaluation", {
    connection,
    defaultJobOptions: {
      ...defaultJobOpts,
      attempts: 2,
      backoff: { type: "exponential", delay: 8000 },
    },
  });
}

export const enqueueBookletEvaluation = async (bookletId, payload = {}) => {
  if (!bookletQueue) throw new Error("Queue not enabled — REDIS_URL not set");
  return bookletQueue.add("evaluate", { bookletId, ...payload }, {
    jobId: `booklet:${bookletId}`,
  });
};

export const enqueueBundleEvaluation = async (bundleId, payload = {}) => {
  if (!bundleQueue) throw new Error("Queue not enabled — REDIS_URL not set");
  return bundleQueue.add("evaluate", { bundleId, ...payload }, {
    jobId: `bundle:${bundleId}`,
  });
};

export const getJobStatus = async (type, id) => {
  const queue = type === "bundle" ? bundleQueue : bookletQueue;
  if (!queue) return null;
  const jobId = `${type}:${id}`;
  const job = await queue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return { jobId, state, progress: job.progress, failedReason: job.failedReason };
};

export { bookletQueue, bundleQueue };
