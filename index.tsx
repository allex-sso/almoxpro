
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Shim para garantir que o acesso a process.env não quebre o app no navegador
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
