import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

export function createQueue(name, redisUrl) {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(name, { connection });
  const events = new QueueEvents(name, { connection });
  return { queue, events, connection };
}

export function createWorker(name, processor, redisUrl, opts = {}) {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const worker = new Worker(name, processor, { connection, ...opts });
  return { worker, connection };
}
