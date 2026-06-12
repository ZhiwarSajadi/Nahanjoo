/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.addEventListener('error', (event) => {
  if (event.message?.includes('INTERNAL ASSERTION FAILED') || event.message?.includes('Pending promise was never set')) {
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || event.reason?.toString() || '';
  const code = event.reason?.code || '';
  if (
    msg.includes('INTERNAL ASSERTION FAILED') || 
    msg.includes('Pending promise was never set') ||
    code === 'auth/network-request-failed' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    event.preventDefault();
  }
});

const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.join(' ');
  if (
    msg.includes('INTERNAL ASSERTION FAILED') || 
    msg.includes('Pending promise was never set') ||
    msg.includes('auth/network-request-failed') ||
    msg.includes('auth/popup-closed-by-user') ||
    msg.includes('auth/cancelled-popup-request')
  ) {
    return;
  }
  originalConsoleError(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
