import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { TxProvider } from './lib/txlog';
import { WalletProvider } from './lib/wallet';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <TxProvider>
          <App />
        </TxProvider>
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>,
);
