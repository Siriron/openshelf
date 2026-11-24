import { formatEther, parseEther } from 'viem';

export const short = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
export const gen = (wei: string | bigint) => {
  const s = formatEther(typeof wei === 'bigint' ? wei : BigInt(wei || '0'));
  return `${s} GEN`;
};
export const toWei = (v: string): bigint => parseEther(v.trim());
export const when = (epoch: number) => (epoch ? new Date(epoch * 1000).toLocaleString() : '-');
export const sameAddr = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
export const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);
