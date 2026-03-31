/** ******************************************************************
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 ****************************************************************** */

import boostContext, { BOOST_EVENT } from '../context/boostContext.js';

function getClickedCta(e) {
  const t = e?.target;
  const link = t?.closest?.('a[href]');
  if (link) {
    const href = link.href || link.getAttribute('href') || '';
    const contentId = link.getAttribute('data-content-id') || undefined;
    return { el: link, href, ...(contentId && { contentId }) };
  }
  const button = t?.closest?.('button[href]') || t?.closest?.('button') || t?.closest?.('[role="button"][href]') || t?.closest?.('[role="button"]');
  if (button) {
    const href = button.getAttribute?.('href') || button.href || '';
    if (href) return { el: button, href };
  }
  return null;
}

function convertToStageLinks(url) {
  const { stageDomainsMap } = boostContext;
  if (!stageDomainsMap || typeof stageDomainsMap !== 'object') return url;
  let result = url;
  for (const [prodDomain, stageDomain] of Object.entries(stageDomainsMap)) {
    if (result.includes(prodDomain)) {
      result = result.replace(prodDomain, stageDomain);
      break;
    }
  }
  return result;
}

/** Parse "url | contentId" and #_blank; used for links and CTAs. */
export function extractHrefAndContentId(href) {
  const parts = decodeURIComponent(href).split(' | ');
  const url = parts[0]?.trim() || '';
  return {
    url: boostContext.env === 'prod' ? url : convertToStageLinks(url),
    contentId: parts.length > 1 ? parts[1]?.trim() : '',
  };
}

/**
 * Emit CTA click events (analytics + navigation).
 */
export function emitCtaClick(container, href) {
  if (!container || !href || href === '#') return;
  const parsed = extractHrefAndContentId(href);
  const { url, contentId: parsedContentId } = parsed;
  const contentId = parsedContentId;
  const navHref = url;

  if (contentId || href) {
    container.dispatchEvent(new CustomEvent(BOOST_EVENT, {
      bubbles: true,
      composed: true,
      detail: {
        type: 'analytics',
        subType: 'track',
        data: { eventType: 'click', subtype: contentId || '', contentAction: url || '' },
      },
    }));
  }
  container.dispatchEvent(new CustomEvent(BOOST_EVENT, {
    bubbles: true,
    composed: true,
    detail: { type: 'navigation', subType: 'url', data: { href: navHref } },
  }));
}

/**
 * Attach one delegated click listener: handle link and CTA (button) clicks,
 * dispatch analytics (if subtype/contentId) then navigation.
 */
export function setupCtaClickHandler(container) {
  if (!container?.addEventListener) return;
  container.addEventListener('click', (e) => {
    const result = getClickedCta(e);
    if (!result) return;
    const { href } = result;
    if (!href || href === '#') return;
    e.preventDefault();
    e.stopPropagation();
    emitCtaClick(container, href);
  }, true);
}

/**
 * @param {Object} opts
 * @param {string} opts.resource - Fragment URL (relative or absolute)
 * @param {boolean} [opts.withCacheRules]
 * @param {(url: string) => string} [opts.resolveUrl] - Optional; return the URL to actually fetch (e.g. CORS proxy).
 */
export async function customFetch({ resource, withCacheRules, resolveUrl }) {
  const options = {};
  let shouldBypassCache = false;
  if (withCacheRules) {
    const params = new URLSearchParams(window.location.search);
    shouldBypassCache = params.get('cache') === 'off';
    options.cache = shouldBypassCache ? 'reload' : 'default';
  }

  const baseUrl = /^https?:\/\//i.test(resource)
    ? new URL(resource)
    : new URL(resource, window.location.origin);
  if (shouldBypassCache) {
    baseUrl.searchParams.set('cb', new Date().getTime());
  }
  const fetchUrl = typeof resolveUrl === 'function' ? resolveUrl(baseUrl.toString()) : baseUrl.toString();
  const response = await fetch(fetchUrl, options);
  if (!resource.endsWith('.plain.html')) {
    return response;
  }

  const html = await response.text();
  const escapeForHtmlAttr = (url) => String(url).replace(/&/g, '&amp;');
  const decodePath = (p) => String(p).replace(/&amp;/gi, '&').replace(/&#x26;/gi, '&').replace(/&#38;/gi, '&');
  const processedHtml = html.replace(
    /(href|src|srcset)="(\.\/[^"\s]*|\.\.\/[^"\s]*|[^"/][^"\s]*)"/g,
    (match, attr, path) => {
      const raw = decodePath(path);
      if (raw.startsWith('http') || raw.startsWith('//') || raw.startsWith('data:')) {
        return match;
      }
      if (attr === 'srcset') {
        const value = raw
          .split(',')
          .map((url) => {
            const [urlPart, size] = url.trim().split(' ');
            const decoded = decodePath(urlPart);
            if (decoded.startsWith('http') || decoded.startsWith('//') || decoded.startsWith('data:')) {
              return url.trim();
            }
            return `${new URL(decoded, baseUrl).href}${size ? ` ${size}` : ''}`;
          })
          .join(', ');
        return `srcset="${escapeForHtmlAttr(value)}"`;
      }
      return `${attr}="${escapeForHtmlAttr(new URL(raw, baseUrl).href)}"`;
    },
  );
  return new Response(processedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: { 'Content-Type': 'text/html' },
  });
}
