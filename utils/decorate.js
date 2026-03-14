import { createTag, getBlockOptions } from './utils.js';

function decorateIconArea() {
  // Reserved for icon-area decoration
}
function elContainsText(el) {
  return el?.textContent?.trim().length > 0;
}

/** Keys that decorateButton accepts from block options (e.g. buttonvariant-primary, ctasize-m). */
const BUTTON_OPTION_KEYS = ['variant', 'size', 'treatment', 'staticColor'];

/**
 * Get button props from block classes with a given prefix. Use in button block (prefix 'button')
 * or row-card CTA (prefix 'cta'). Returns only keys valid for decorateButton.
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
  const el = createTag(tag, { class: className });
  el.textContent = text;
  if (target) target.appendChild(el);
  return el;
}

/** Preset keys that map to .{key} classes in styles.css (e.g. .heading-xl, .body-m).
 * Use Font block or decorateFont() anywhere. */
export const FONT_PRESET_KEYS = new Set([
  'heading-xl', 'heading-lg', 'heading-m', 'heading-sm', 'heading-xs',
  'title-xl', 'title-lg', 'title-m', 'title-s', 'title-xs',
  'body-xl', 'body-lg', 'body-m', 'body-sm', 'body-xs',
]);

export function decorateButton({
  target, key, descriptor, href, variant, size, treatment, staticColor, ariaLabel, contentId,
}) {
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
  if (ariaLabel) {
    button.setAttribute('aria-label', ariaLabel);
  }
  if (contentId) {
    button.setAttribute('data-content-id', contentId);
  }
  button.textContent = descriptor?.value ?? '';
  target.appendChild(button);
}

export function getBlockSize(el, defaultSize = 1) {
  const sizes = ['small', 'medium', 'large', 'xlarge', 'medium-compact'];
  if (defaultSize < 0 || defaultSize > sizes.length - 1) return null;
  return sizes.find((size) => el.classList.contains(size)) || sizes[defaultSize];
}

export function decorateBlockText(el, config = ['m', 'sm', 'm'], type = null) {
  if (!el.classList.contains('default')) {
    let headings = el?.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings) {
      if (type === 'hasDetailHeading' && headings.length > 1) headings = [...headings].splice(1);
      headings.forEach((h) => h.classList.add(`heading-${config[0]}`));
      if (config[2]) {
        const prevSib = headings[0]?.previousElementSibling;
        prevSib?.classList.toggle(`detail-${config[2]}`, !prevSib.querySelector('picture'));
        decorateIconArea(el);
      }
    }
    const bodyStyle = `body-${config[1]}`;
    const emptyEls = el?.querySelectorAll(':is(p, ul, ol, div):not([class])');
    if (emptyEls.length) {
      [...emptyEls].filter(elContainsText).forEach((e) => e.classList.add(bodyStyle));
    } else if (!el.classList.length && elContainsText(el)) {
      el.classList.add(bodyStyle);
    }
  }
}

function applyTextOverrides(el, override, targetEl) {
  const parts = override.split('-');
  const type = parts[1];
  const scopeEl = (targetEl !== false) ? targetEl : el;
  const els = scopeEl.querySelectorAll(`[class^="${type}"]`);
  if (!els.length) return;
  els.forEach((elem) => {
    const replace = [...elem.classList].find((i) => i.startsWith(type));
    elem.classList.replace(replace, `${parts[1]}-${parts[0]}`);
  });
}

export function decorateTextOverrides(el, options = ['-heading', '-body', '-detail', '-title'], target = false) {
  const overrides = [...el.classList]
    .filter((elClass) => options.findIndex((ovClass) => elClass.endsWith(ovClass)) >= 0);
  if (!overrides.length) return;
  overrides.forEach((override) => {
    applyTextOverrides(el, override, target);
    el.classList.remove(override);
  });
}
