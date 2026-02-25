/**
 * React test app for <xe-sites> (Option 1: npm/bundler).
 * Registers the web component before React mounts.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

// Optional: for cross-origin fragment URLs (CORS)
window.hlx = window.hlx || {};
window.hlx.codeBasePath = '';
window.app = window.app || {};
// window.xeSitesFragmentProxy = 'https://api.allorigins.win/raw?url=';

// Register <xe-sites> and bundle its CSS (init.js imports Lit + Spectrum + CSS)
import '@adobecom/da-xe-surfaces';

import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
