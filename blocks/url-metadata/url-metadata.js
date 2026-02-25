import { setUrlMetadata } from '../../utils/utils.js';

/** Allowed column header names (first row). Normalized: trim, lowercase, remove spaces/hyphens. */
const URL_SLOTS = ['cchstage', 'cchprod', 'ccdstage', 'ccdprod'];
const SSO_SLOT = 'ssodetails';
const ALLOWED_SLOTS = new Set([...URL_SLOTS, SSO_SLOT]);

function normalizeHeader(text) {
  return (text || '').trim().toLowerCase().replace(/[\s-]+/g, '');
}

function getHref(cell) {
  const a = cell?.querySelector('a');
  return a?.href?.trim() || '';
}

/**
 * Parse SSO details: "responseType: code | clientId:... | scope:openid,creative_cloud"
 * @param {string} text - Cell text
 * @returns {Record<string, string>} Object of key/value pairs
 */
function parseSsoDetails(text) {
  const sso = {};
  if (!text || typeof text !== 'string') return sso;
  const parts = text.split('|').map((p) => p.trim()).filter(Boolean);
  parts.forEach((part) => {
    const colon = part.indexOf(':');
    if (colon > 0) {
      const key = part.slice(0, colon).trim();
      const value = part.slice(colon + 1).trim();
      if (key) sso[key] = value;
    }
  });
  return sso;
}

/**
 * Parse first row as header: column 0 = shorthand, columns 1+ = slot names
 * (cchstage, cchprod, ccwebstage, ccwebprod, ccdstage, ccdprod, ssodetails).
 * @param {Element} headerRow - First row div
 * @returns {string[]} Ordered slot names for columns 1, 2, ...
 */
function getSlotsFromHeaderRow(headerRow) {
  const cells = [...headerRow.children];
  const slots = [];
  for (let i = 1; i < cells.length; i += 1) {
    const normalized = normalizeHeader(cells[i]?.textContent || '');
    if (ALLOWED_SLOTS.has(normalized)) slots.push(normalized);
  }
  return slots;
}

export default function decorate(block) {
  const rows = [...block.children].filter((el) => el.tagName === 'DIV');
  if (rows.length < 2) return;

  const headerRow = rows[0];
  const slots = getSlotsFromHeaderRow(headerRow);
  if (!slots.length) return;

  const entries = {};
  rows.slice(1).forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const shorthand = (cells[0]?.textContent || '').trim();
    if (!shorthand) return;

    const entry = {};
    slots.forEach((slot, i) => {
      const cell = cells[i + 1];
      if (!cell) return;
      if (slot === SSO_SLOT) {
        const sso = parseSsoDetails((cell.textContent || '').trim());
        if (Object.keys(sso).length) entry.sso = sso;
      } else {
        const url = getHref(cell);
        if (url) entry[slot] = url;
      }
    });
    if (Object.keys(entry).length) entries[shorthand] = entry;
  });
  setUrlMetadata(entries);
}
