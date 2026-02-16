import { createTag } from './utils.js';

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

export function decorateButton({ target, key, descriptor, href, variant, size }) {
  const button = createTag('sp-button', {
    variant: variant ?? 'primary',
    size: size ?? 'm',
    ...(key && { key }),
  });
  if (href) {
    button.setAttribute('href', href);
  }
  button.textContent = descriptor?.value ?? '';
  target.appendChild(button);
}
