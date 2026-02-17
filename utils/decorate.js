import { createTag, getBlockOptions } from './utils.js';

/** Keys that decorateButton accepts from block options (e.g. buttonvariant-primary, ctasize-m). */
const BUTTON_OPTION_KEYS = ['variant', 'size', 'treatment', 'staticColor'];

/**
 * Get button props from block classes with a given prefix. Use in button block (prefix 'button')
 * or hva-card CTA (prefix 'cta'). Returns only keys valid for decorateButton.
 * @param {Element} block - Block element
 * @param {string} prefix - Class prefix (e.g. 'button' or 'cta')
 * @returns {Record<string, string>} Props to spread into decorateButton
 */
export function getButtonProps(block, prefix) {
  const options = getBlockOptions(block, prefix);
  const props = {};
  BUTTON_OPTION_KEYS.forEach((key) => {
    if (options[key] != null) props[key] = options[key];
  });
  return props;
}

/**
 * Appends a no-wrap text element to the target.
 * @param {Object} options
 * @param {Element} options.target - Parent to append the text to
 * @param {string} [options.text] - Text content
 * @param {string} [options.tag='span'] - Wrapper tag
 * @param {string} [options.className='text-nowrap'] - Class for no-wrap styling
 */
export function decorateText({ target, text = '', tag = 'span', className = 'text-nowrap' }) {
  const el = createTag(tag, { font: 'title-lg' });
  el.textContent = text;
  if (target) target.appendChild(el);
  return el;
}

/**
 * Normalize a CSS value so Spectrum (or any) CSS variables apply correctly.
 * - "var(--spectrum-...)" left as-is
 * - "--spectrum-..." or "--anything" wrapped as "var(--anything)"
 */
function normalizeCssValue(value) {
  const v = value.trim();
  if (v.startsWith('var(')) return v;
  if (v.startsWith('--')) return `var(${v})`;
  return v;
}

/** Convert kebab-case to camelCase for style properties */
function kebabToCamel(str) {
  return str.replace(/-([a-z])/gi, (_, c) => c.toUpperCase());
}

/** Preset keys that map to .{key} classes in styles.css (e.g. .heading-xl, .body-m). Use Font block or decorateFont() anywhere. */
export const FONT_PRESET_KEYS = new Set([
  'heading-xxxl', 'heading-xxl', 'heading-xl', 'heading-l', 'heading-m', 'heading-s', 'heading-xs', 'heading-xxs',
  'body-xxxl', 'body-xxl', 'body-xl', 'body-l', 'body-m', 'body-s', 'body-xs',
  'detail-l', 'detail-m', 'detail-s',
]);

/**
 * Apply a predefined font (typography) class only. Use for "font" row in Font block.
 * @param {string} value - Preset key (e.g. "heading-xl", "body-m"). Must be in FONT_PRESET_KEYS.
 * @param {Element} element - Element to add the class to.
 */
export function decorateFontPreset(value, element) {
  if (!value?.trim() || !element) return;
  const presetKey = value.trim().toLowerCase().replace(/\s+/g, '-');
  if (FONT_PRESET_KEYS.has(presetKey)) element.classList.add(presetKey);
}

/**
 * Split CSS declaration string by comma or semicolon, without splitting inside var(...) or other parens.
 */
function splitCssDeclarations(str) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i += 1) {
    const c = str[i];
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (depth === 0 && (c === ',' || c === ';')) {
      out.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(str.slice(start).trim());
  return out.filter(Boolean);
}

/**
 * Parse a single style token. Supports:
 * - "property: value" → use value (with normalizeCssValue)
 * - "font-size-400" → font-size: var(--spectrum-font-size-400)
 * - "font-weight-700" → font-weight: 700 (number used directly)
 * - "line-height-400" → line-height: var(--spectrum-line-height-400)
 * @returns {{ prop: string, value: string } | null}
 */
function parseStyleToken(decl) {
  const trimmed = decl.trim();
  const colon = trimmed.indexOf(':');
  if (colon > 0) {
    const prop = trimmed.slice(0, colon).trim();
    const val = trimmed.slice(colon + 1).trim();
    if (prop && val !== undefined) return { prop: kebabToCamel(prop), value: normalizeCssValue(val) };
    return null;
  }
  const lower = trimmed.toLowerCase();
  const fontSizeMatch = lower.match(/^font-size-(\d+)$/);
  if (fontSizeMatch) return { prop: 'fontSize', value: `var(--spectrum-font-size-${fontSizeMatch[1]})` };
  const fontWeightMatch = lower.match(/^font-weight-(\d+)$/);
  if (fontWeightMatch) return { prop: 'fontWeight', value: fontWeightMatch[1] };
  const lineHeightMatch = lower.match(/^line-height-(\d+)$/);
  if (lineHeightMatch) return { prop: 'lineHeight', value: `var(--spectrum-line-height-${lineHeightMatch[1]})` };
  return null;
}

/**
 * Apply optional font-related CSS. Use for "style" row in Font block.
 * Accepts:
 * - Full form: "font-size: 1rem, font-weight: 700"
 * - Shorthand: "font-size-400, font-weight-700, line-height-400" (Spectrum vars for size/line-height, number for weight)
 * @param {string} value - Comma-separated declarations or shorthand tokens.
 * @param {Element} element - Element to apply inline styles to.
 */
export function decorateFontStyle(value, element) {
  if (!value?.trim() || !element?.style) return;
  const declarations = splitCssDeclarations(value.trim());
  declarations.forEach((decl) => {
    const parsed = parseStyleToken(decl);
    if (parsed) element.style[parsed.prop] = parsed.value;
  });
}

export function decorateButton({ target, key, descriptor, href, variant, size, treatment, staticColor }) {
  const button = createTag('sp-button', {
    variant: variant ?? 'primary',
    size: size ?? 'm',
    ...(treatment && { treatment }),
    ...(staticColor && { 'static-color': staticColor }),
    ...(key && { key }),
  });
  if (href) {
    button.setAttribute('href', href);
  }
  button.textContent = descriptor?.value ?? '';
  target.appendChild(button);
}
