import { createTag, fetchMediaAsBlobUrl, parseIconClass, resolveIcon } from '../../utils/utils.js';
import { decorateButton, getButtonProps } from '../../utils/decorate.js';

const CELLS = ['picture', 'title', 'description', 'link'];

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i;

/** Replace img/src and picture/source src/srcset with blob URLs (fetch with retry for 425).
 * No proxy; CORS via server headers. */
function replaceMediaUrlsWithBlobUrls(node) {
  if (!node) return;
  const applyBlobUrl = (el, attr, url) => {
    if (!url || url.startsWith('data:')) return;
    fetchMediaAsBlobUrl(url).then((src) => {
      el.setAttribute(attr, src);
    });
  };
  node.querySelectorAll('img[src]').forEach((img) => {
    applyBlobUrl(img, 'src', img.getAttribute('src'));
  });
  node.querySelectorAll('source[src]').forEach((source) => {
    applyBlobUrl(source, 'src', source.getAttribute('src'));
  });
  node.querySelectorAll('source[srcset]').forEach((source) => {
    const srcset = source.getAttribute('srcset');
    if (!srcset) return;
    const entries = srcset.split(',').map((s) => {
      const tokens = s.trim().split(/\s+/);
      return { url: tokens[0], descriptor: tokens[1] ? ` ${tokens[1]}` : '' };
    });
    Promise.all(entries.map(({ url }) => fetchMediaAsBlobUrl(url))).then((urls) => {
      source.setAttribute('srcset', urls.map((u, i) => `${u}${entries[i].descriptor}`).join(', '));
    });
  });
}

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
 * Resolve icon from picture cell: picture/img, image URL (link or text),
 *  icon name(decorateIcons runs before blocks).
 */
async function getIconFromPictureCell(pictureCell) {
  const picture = pictureCell?.querySelector('picture, img');
  if (picture) {
    const clone = picture.cloneNode(true);
    replaceMediaUrlsWithBlobUrls(clone);
    return clone;
  }
  const link = pictureCell?.querySelector('a');
  let href = link?.href?.trim();
  if (!href) {
    const text = pictureCell?.textContent?.trim() || '';
    if (IMAGE_EXT.test(text)) href = text;
  }
  if (href && IMAGE_EXT.test(href)) {
    const img = createTag('img', { alt: link?.textContent?.trim() || '', loading: 'lazy' });
    fetchMediaAsBlobUrl(href).then((src) => {
      img.src = src;
    });
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

  const iconWrap = createTag('div', { class: 'row-card-icon' });
  if (iconImage) {
    iconWrap.append(iconImage);
  }

  const body = createTag('div', { class: 'row-card-body' });
  if (title) {
    const titleEl = createTag('h3', { class: 'row-card-title' });
    titleEl.textContent = title;
    body.append(titleEl);
  }
  if (description) {
    const descEl = createTag('p', { class: 'row-card-description' });
    descEl.textContent = description;
    body.append(descEl);
  }

  const ctaWrap = createTag('div', { class: 'row-card-cta' });
  decorateButton({
    target: ctaWrap,
    descriptor: { value: ctaLabel },
    href,
    ...(ariaLabel && { ariaLabel }),
    ...(contentId && { contentId }),
    ...(contentName && { contentName }),
    ...getButtonProps(block, 'cta'),
  });

  const inner = createTag('div', { class: 'row-card-inner' });
  inner.append(iconWrap, body, ctaWrap);

  block.innerHTML = '';
  block.append(inner);
}
