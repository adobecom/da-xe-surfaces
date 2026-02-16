import { createTag, getBlockOptions } from '../../utils/utils.js';
import { decorateButton } from '../../utils/decorate.js';

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

  const ctaOptions = getBlockOptions(block, 'cta');

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
  if (title) body.append(createTag('h3', { class: 'hva-card-title' }, title));
  if (description) body.append(createTag('p', { class: 'hva-card-description' }, description));

  const ctaWrap = createTag('div', { class: 'hva-card-cta' });
  decorateButton({
    target: ctaWrap,
    key: 'cta',
    descriptor: { value: ctaLabel },
    href,
    ...ctaOptions,
  });

  const inner = createTag('div', { class: 'hva-card-inner' });
  inner.append(iconWrap, body, ctaWrap);

  block.innerHTML = '';
  block.append(inner);
}
