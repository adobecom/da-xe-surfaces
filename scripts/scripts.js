/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */



/** Fallback Boost app base when preview-metadata has no targetApp or environment. */
const DEFAULT_BOOST_APP_BASE = 'https://dev.hollywoodstudios.corp.adobe.com:9000';

/**
 * Resolve Boost app base URL from preview-metadata.
 * Uses targetApp only when it is a full URL (e.g. https://...); otherwise uses environment or default.
 */
function getBoostAppBase(preview) {
  const raw = (preview?.targetApp || '').trim();
  if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    return raw.replace(/\/$/, '');
  }
  if (preview?.environment === 'dev') return 'https://dev.hollywoodstudios.corp.adobe.com:9000';
  return DEFAULT_BOOST_APP_BASE;
}

/**
 * Build the plain.html URL for the current page (same origin + path → .plain.html).
 * e.g. / → index.plain.html, /foo/ → foo/index.plain.html, /bar.html → bar.plain.html
 */
function getCurrentPlainHtmlUrl() {
  const { origin, pathname } = window.location;
  const base = pathname === '/' || pathname === '' ? '/' : pathname.replace(/\/$/, '') || '/';
  if (base === '/' || pathname.endsWith('/')) {
    return `${origin}${base}index.plain.html`;
  }
  if (/\.html?$/i.test(pathname)) {
    return `${origin}${pathname.replace(/\.html?$/i, '')}.plain.html`;
  }
  return `${origin}${pathname}.plain.html`;
}

/**
 * Parse preview-metadata "params" row: "layout: tray | environment: dev | targetApp: cch".
 * Returns { layout, environment, targetApp }.
 */
function parsePreviewMetadataParams(block) {
  const data = { layout: '', environment: '', targetApp: '' };
  if (!block?.children?.length) return data;
  for (const row of block.children) {
    const cells = [...row.children];
    if (cells.length < 2) continue;
    const key = (cells[0].textContent || '').trim().toLowerCase();
    const value = (cells[1].textContent || '').trim();
    if (key !== 'params' || !value) continue;
    value.split(/\s*\|\s*/).forEach((part) => {
      const colon = part.indexOf(':');
      if (colon === -1) return;
      const k = part.slice(0, colon).trim().toLowerCase().replace(/\s+/g, '');
      const v = part.slice(colon + 1).trim();
      if (!v) return;
      if (k === 'layout') data.layout = v;
      else if (k === 'environment') data.environment = v;
      else if (k === 'targetapp') data.targetApp = v;
    });
    break;
  }
  return data;
}

/**
 * Parse preview-metadata block from HTML.
 * Supports single-row format: params → "layout: tray | environment: dev | targetApp: cch".
 */
function parsePreviewBlockFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const block = doc.querySelector('.preview-metadata') || doc.querySelector('[class*="preview-metadata"]')
    || doc.querySelector('.preview-block') || doc.querySelector('[class*="preview-block"]');
  const fromPreview = block ? parsePreviewMetadataParams(block) : {};
  return {
    layout: fromPreview.layout || '',
    environment: fromPreview.environment || '',
    targetApp: fromPreview.targetApp || '',
  };
}

/**
 * Redirect to Boost app using preview-metadata (layout, environment, targetApp) from plain.html.
 * Fetches plain.html, parses .preview-metadata, then redirects to targetApp/boost?url=plainUrl.
 */
async function redirectToBoost() {
  const plainUrl = getCurrentPlainHtmlUrl();
  let preview = {};

  try {
    const res = await fetch(plainUrl);
    if (res.ok) {
      const html = await res.text();
      preview = parsePreviewBlockFromHtml(html);
    }
  } catch (_) {
    // use defaults
  }
  const layout = preview.layout || '';
  const base = getBoostAppBase(preview);

  // CCD: open aam:// URI directly (same as opening stage.adobe.com). Browser prompts "Open with Creative Cloud?".
  if (preview.targetApp === 'ccd') {
    const routePath = `/boost${layout ? `&layout=${layout}` : ''}&url=${plainUrl}`;
    const aamDeeplink = `aam://adobecreativecloud/?workflow=routeToPath&routePath=${encodeURIComponent(routePath)}`;
    window.location.replace(aamDeeplink);
    return;
  }

  const boostPath = '/boost';
  const boostUrl = `${base}${boostPath}?url=${plainUrl}${layout ? `&layout=${layout}` : ''}`;
  window.location.replace(boostUrl);
}


// Redirect to Boost app using preview-block (layout, environment, targetApp); Milo blocks are not loaded.
(async () => { await redirectToBoost(); })();
