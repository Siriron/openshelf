// The one place the deployed contract address lives (StudioNet).
export const CONTRACT_ADDRESS: string = '0xc255bFb1Dd218Dc6e71b21654CBC785c82070348';

export const IS_DEPLOYED = CONTRACT_ADDRESS.length > 0;

export const EXPLORER = 'https://explorer-studio.genlayer.com';
export const explorerTx = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const explorerAddress = (addr: string) => `${EXPLORER}/address/${addr}`;

export const STUDIONET = {
  chainId: '0xF22F', // 61999
  chainName: 'GenLayer StudioNet',
  rpcUrls: ['https://studio.genlayer.com/api'],
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  blockExplorerUrls: [EXPLORER],
};
