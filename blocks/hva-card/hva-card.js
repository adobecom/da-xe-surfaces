import { createTag, parseIconClass, resolveIcon } from '../../utils/utils.js';
import { decorateButton, decorateText, getButtonProps } from '../../utils/decorate.js';

const CELLS = ['picture', 'title', 'description', 'link'];

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i;

/** First row may be headers; use the row that has actual content (e.g. span.icon or link). */
function getContentRow(block) {
  const rows = [...block.children].filter((r) => r.children?.length >= CELLS.length);
  const headerLike = (cell) => {
    const t = (cell?.textContent || '').trim().toLowerCase();
    return CELLS.includes(t) || t === 'image';
  };
  const dataRow = rows.find((row) => {
    const first = row.children?.[0];
    return first && !headerLike(first) && (first.querySelector?.('span.icon, picture, img, a') || first.textContent?.trim());
  });
  return dataRow || rows[0] || block.firstElementChild;
}

function getCellContent(block, name) {
  const row = getContentRow(block);
  if (!row) return null;
  const cells = row.children;
  const i = CELLS.indexOf(name);
  if (i < 0 || !cells[i]) return null;
  return cells[i];
}

/**
 * Resolve icon from picture cell: picture/img, image URL (link or text), icon name (Spectrum/content),
 * or already-replaced sp-icon-* (decorateIcons runs before blocks).
 */
async function getIconFromPictureCell(pictureCell) {
  const picture = pictureCell?.querySelector('picture, img');
  if (picture) return picture.cloneNode(true);
  const link = pictureCell?.querySelector('a');
  let href = link?.href?.trim();
  if (!href) {
    const text = pictureCell?.textContent?.trim() || '';
    if (IMAGE_EXT.test(text)) href = text;
  }
  if (href && IMAGE_EXT.test(href)) {
    const img = createTag('img', { src: href, alt: link?.textContent?.trim() || '', loading: 'lazy' });
    return img;
  }
  const existingSpIcon = [...(pictureCell?.children || [])].find((el) => el?.tagName?.toLowerCase().startsWith('sp-icon-'));
  if (existingSpIcon) return existingSpIcon.cloneNode(true);
  const existingSvg = pictureCell?.querySelector('svg');
  if (existingSvg) return existingSvg.cloneNode(true);
  const iconSpan = pictureCell?.querySelector('span.icon');
  if (iconSpan) {
    const iconClass = [...(iconSpan.classList || [])].find((c) => c.startsWith('icon-'))?.slice(5) ?? '';
    const { name, size } = parseIconClass(iconClass);
    if (name) return resolveIcon(name, { size: size || 'm' });
  }
  const iconName = pictureCell?.textContent?.trim();
  if (iconName) return resolveIcon(iconName, { size: 'm' });
  return null;
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

  const iconImage = await getIconFromPictureCell(pictureCell);
  const title = titleCell?.textContent?.trim() || '';
  const description = descCell?.textContent?.trim() || '';
  const linkEl = linkCell?.querySelector('a');
  const href = linkEl?.href?.trim() || '#';
  
  // Read attributes that were already set by decorateLinks
  const ctaLabel = (linkEl?.textContent ?? '').trim() || 'Learn more';
  const ariaLabel = linkEl?.getAttribute('aria-label') || null;
  const contentId = linkEl?.getAttribute('data-content-id') || null;
  const contentName = linkEl?.getAttribute('data-content-name') || null;

  const iconWrap = createTag('div', { class: 'hva-card-icon' });
  if (iconImage) {
    iconWrap.append(iconImage);
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
    ...(ariaLabel && { ariaLabel }),
    ...(contentId && { contentId }),
    ...(contentName && { contentName }),
    ...getButtonProps(block, 'cta'),
  });

  const inner = createTag('div', { class: 'hva-card-inner' });
  inner.append(iconWrap, body, ctaWrap);

  block.innerHTML = '';
  block.append(inner);
}
