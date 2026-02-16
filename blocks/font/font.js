import { decorateFontPreset, decorateFontStyle } from '../../utils/decorate.js';

/**
 * Block rows:
 * - font: predefined class only (e.g. heading-xl, body-m). See styles.css typography.
 * - style: optional CSS (font-weight, font-size, line-height, etc.). Comma-separated, supports var(--spectrum-*).
 * - text: optional content to render; if present, block is visible with styled text.
 */
function getFontOptions(el) {
  return [...el.childNodes].reduce((acc, row) => {
    if (!row.children || row.children.length < 2) return acc;
    const key = row.children[0].textContent.trim().toLowerCase();
    const value = row.children[1].textContent.trim();
    if (!key || value === undefined) return acc;
    if (key === 'font' || key === 'preset') acc.font = value;
    else if (key === 'style' || key === 'custom') acc.style = value;
    else if (key === 'text') acc.text = value;
    return acc;
  }, {});
}

export default async function init(el) {
  const options = getFontOptions(el);
  const hasText = options.text != null && options.text !== '';

  if (hasText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'font-block-content';
    wrapper.textContent = options.text;
    if (options.font) decorateFontPreset(options.font, wrapper);
    if (options.style) decorateFontStyle(options.style, wrapper);
    el.replaceChildren(wrapper);
  } else {
    const section = el.closest('.section') || el.parentElement;
    if (section) {
      if (options.font) decorateFontPreset(options.font, section);
      if (options.style) decorateFontStyle(options.style, section);
    }
    el.classList.add('font-block-metadata-only');
  }
}
