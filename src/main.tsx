import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

console.log('main.tsx loaded');
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

// Global error handlers to surface runtime errors (helps debugging blank page in production)
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error || event.message);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:24px;font-family:sans-serif;color:#900;background:#fee;border:1px solid #900;">
      <h2>Application Error</h2>
      <pre style="white-space:pre-wrap;overflow:auto;max-height:60vh;">${(event.error && event.error.stack) || event.message}</pre>
      <p>Please copy this error and share it so we can fix the issue.</p>
    </div>`;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:24px;font-family:sans-serif;color:#900;background:#fee;border:1px solid #900;">
      <h2>Unhandled Promise Rejection</h2>
      <pre style="white-space:pre-wrap;overflow:auto;max-height:60vh;">${String(event.reason)}</pre>
      <p>Please copy this error and share it so we can fix the issue.</p>
    </div>`;
  }
});

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('App rendered');
} else {
  console.error('Root element not found!');
}
