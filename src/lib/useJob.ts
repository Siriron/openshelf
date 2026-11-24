import { useCallback, useEffect, useState } from 'react';
import { getBalance, getJob } from './api';
import { friendlyError } from './chain';
import { IS_DEPLOYED } from '../config/chains';
import type { Job } from './types';

/** Loads one job plus both parties' claimable balances. Manual refresh only: no polling (StudioNet is rate-limited). */
export function useJob(id: number | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [balances, setBalances] = useState<{ client: string; provider: string }>({ client: '0', provider: '0' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (id === null || !IS_DEPLOYED) return;
    setLoading(true);
    setError('');
    try {
      const j = await getJob(id);
      const [c, p] = await Promise.all([getBalance(j.client), getBalance(j.provider)]);
      setJob(j);
      setBalances({ client: c.claimable, provider: p.claimable });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setJob(null);
    void refresh();
  }, [refresh]);

  return { job, balances, loading, error, refresh };
}
