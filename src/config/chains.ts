// The one place the deployed contract address lives. Empty until the contract is deployed to StudioNet:
// paste the address between the quotes, nothing else needs to change.
export const CONTRACT_ADDRESS: string = '';

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
