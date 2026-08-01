import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handler to suppress common browser extension errors
// that are unrelated to the application logic (e.g., 'onMessage' from React DevTools/AdBlockers)
const suppressExtensionErrors = (message: string) => {
  return message && (message.includes('onMessage') || message.includes('reading \'onMessage\''));
};

window.addEventListener('error', (e) => {
  if (suppressExtensionErrors(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault(); // Completely hide from console
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message && suppressExtensionErrors(e.reason.message)) {
    e.stopImmediatePropagation();
    e.preventDefault(); // Completely hide from console
  }
});

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