import { decorateButton, getButtonProps } from '../../utils/decorate.js';

export default async function decorate(block) {
  await customElements.whenDefined('sp-button');

  const row = block.firstElementChild;
  const firstCell = row?.children?.[0] ?? row;
  const link = firstCell?.querySelector?.('a');
  const text = (link?.textContent ?? firstCell?.textContent ?? '').trim() || 'Button';
  const href = link?.href?.trim() || '';

  const wrapper = document.createElement('div');
  wrapper.className = 'button-wrapper';

  decorateButton({
    target: wrapper,
    descriptor: { value: text },
    href: href || undefined,
    ...getButtonProps(block, 'cta'),
  });

  block.innerHTML = '';
  block.append(wrapper);
}
