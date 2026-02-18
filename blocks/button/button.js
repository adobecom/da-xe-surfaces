import { decorateButton, getButtonProps } from '../../utils/decorate.js';

export default async function decorate(block) {
  await customElements.whenDefined('sp-button');

  const row = block.firstElementChild;
  const firstCell = row?.children?.[0] ?? row;
  const link = firstCell?.querySelector?.('a');
  
  // Get text from link (decorateLinks has already processed it)
  const text = (link?.textContent ?? firstCell?.textContent ?? '').trim() || 'Button';
  const href = link?.href?.trim() || '';
  
  // Read attributes that were already set by decorateLinks
  const ariaLabel = link?.getAttribute('aria-label') || null;
  const contentId = link?.getAttribute('data-content-id') || null;
  const contentName = link?.getAttribute('data-content-name') || null;

  const wrapper = document.createElement('div');
  wrapper.className = 'button-wrapper';

  decorateButton({
    target: wrapper,
    descriptor: { value: text },
    href: href || undefined,
    ...(ariaLabel && { ariaLabel }),
    ...(contentId && { contentId }),
    ...(contentName && { contentName }),
    ...getButtonProps(block, 'cta'),
  });

  block.innerHTML = '';
  block.append(wrapper);
}
