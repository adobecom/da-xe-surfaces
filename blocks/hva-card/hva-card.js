import { createTag } from '../../utils/utils.js';
import { decorateButton, decorateText, getButtonProps } from '../../utils/decorate.js';

const CELLS = ['picture', 'title', 'description', 'link'];

function getCellContent(block, name) {
  const row = block.firstElementChild;
  if (!row) return null;
  const cells = row.children;
  const i = CELLS.indexOf(name);
  if (i < 0 || !cells[i]) return null;
  return cells[i];
}

export default async function decorate(block) {
  await Promise.all([
    customElements.whenDefined('sp-theme'),
    customElements.whenDefined('sp-button'),
  ]);

  const pictureCell = getCellContent(block, 'picture');
  const titleCell = getCellContent(block, 'title');
  const descCell = getCellContent(block, 'description');
  const linkCell = getCellContent(block, 'link');

  const picture = pictureCell?.querySelector('picture, img');
  const title = titleCell?.textContent?.trim() || '';
  const description = descCell?.textContent?.trim() || '';
  const linkEl = linkCell?.querySelector('a');
  const href = linkEl?.href?.trim() || '#';
  const ctaLabel = linkEl?.textContent?.trim() || 'Learn more';

  const iconWrap = createTag('div', { class: 'hva-card-icon' });
  if (picture) {
    const clone = picture.cloneNode(true);
    iconWrap.append(clone);
  }

  const body = createTag('div', { class: 'hva-card-body' });
  if (title) {
    const titleEl = createTag('h3', { class: 'hva-card-title' });
    decorateText({ target: titleEl, text: title, className: 'text-nowrap' });
    body.append(titleEl);
  }
  if (description) {
    const descEl = createTag('p', { class: 'hva-card-description' });
    decorateText({ target: descEl, text: description, className: 'text-nowrap' });
    body.append(descEl);
  }

  const ctaWrap = createTag('div', { class: 'hva-card-cta' });
  decorateButton({
    target: ctaWrap,
    descriptor: { value: ctaLabel },
    href,
    ...getButtonProps(block, 'cta'),
  });

  const inner = createTag('div', { class: 'hva-card-inner' });
  inner.append(iconWrap, body, ctaWrap);

  block.innerHTML = '';
  block.append(inner);
}
