import { readJson } from './chain';
import type { Job } from './types';

export const getJob = (id: number) => readJson<Job>('get_job', [BigInt(id)]);
export const getJobs = (offset: number, limit: number) =>
  readJson<{ total: number; jobs: Job[] }>('get_jobs', [BigInt(offset), BigInt(limit)]);
export const getBalance = (addr: string) => readJson<{ claimable: string }>('get_balance', [addr]);
export const getLastJob = (addr: string) => readJson<{ job_id: number }>('get_last_job', [addr]);
