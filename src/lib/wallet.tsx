import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ensureChain, friendlyError } from './chain';

interface WalletCtx {
  account: string | null;
  hasWallet: boolean;
  connecting: boolean;
  error: string;
  connect: () => Promise<void>;
}

const Ctx = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // reconnect silently if already authorised, and stay in sync when the wallet switches account
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    eth
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        const list = accounts as string[];
        if (list[0]) setAccount(list[0]);
      })
      .catch(() => undefined);
    const onChange = (accounts: string[]) => setAccount(accounts[0] ?? null);
    eth.on?.('accountsChanged', onChange);
    return () => eth.removeListener?.('accountsChanged', onChange);
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setError('No browser wallet found. Install MetaMask or open this page in your wallet app browser.');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      await ensureChain();
      setAccount(accounts[0] ?? null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const value = useMemo(
    () => ({ account, hasWallet: !!window.ethereum, connecting, error, connect }),
    [account, connecting, error, connect],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWallet must be used inside WalletProvider');
  return v;
}
