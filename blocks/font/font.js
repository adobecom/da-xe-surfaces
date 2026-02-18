import { decorateFontPreset, decorateFontStyle } from '../../utils/decorate.js';

/**
 * Block rows:
 * - font: predefined class only (e.g. heading-xl, body-m). See styles.css typography.
 * - style: optional CSS tokens or declarations. Comma-separated, supports:
 *   • Shorthand: font-size-400, font-weight-700, line-height-400
 *   • Alignment: center, left, right, justify
 *   • Full declarations: font-size: 1rem, font-weight: 700
 * - text: optional content to render as HTML; if present, block is visible with font preset/style applied.
 */
function getFontOptions(el) {
  return [...el.childNodes].reduce((acc, row) => {
    if (!row.children || row.children.length < 2) return acc;
    const key = row.children[0].textContent.trim().toLowerCase();
    const cell1 = row.children[1];
    const value = key === 'text' ? cell1.innerHTML.trim() : cell1.textContent.trim();
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
    wrapper.innerHTML = options.text;
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
