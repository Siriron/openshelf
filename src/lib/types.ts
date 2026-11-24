export interface RecordFile { name: string; size: number; md5: string }
export interface RecordFacts {
  id: string; doi: string; created: number; pub_date: string; title: string; description: string;
  keywords: string[]; license: string; access: string; kind: string; creators: string[];
  files: RecordFile[]; files_total: number; bytes_total: number; token_found: boolean;
}
export interface Ruling {
  record_id: string; record: RecordFacts; statuses: string[]; reasons: string[]; note: string;
  met: number; total: number; at: number;
}
export type JobStatus = 'OPEN' | 'SETTLED';
export interface Job {
  id: number; title: string; terms: string[]; client: string; provider: string; token: string; fee: string;
  opened: number; deadline: number; status: JobStatus; filings: number; filings_left: number; best_met: number;
  record_id: string; best_ruling: Ruling | null; last_ruling: Ruling | null; provider_credit: string; client_credit: string;
}
