/**
 * Vimeo block: when a link matches vimeo (autoblock), loadBlock is called with the anchor.
 * Renders the Vimeo iframe immediately.
 */
import { createTag } from '../../utils/utils.js';

function getHref(link) {
  if (!link || !link.href) return '';
  const raw = (link.getAttribute && link.getAttribute('href')) || link.href || '';
  const str = String(raw)
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .trim();
  if (!str) return '';
  try {
    return new URL(str, document.baseURI || window.location.href).href;
  } catch {
    return str;
  }
}

function getVimeoId(href) {
  if (!href || typeof href !== 'string') return '';
  const m = href.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : '';
}

export default function decorate(block) {
  const link = block.tagName === 'A' ? block : block.querySelector('a');
  const href = getHref(link);

  if (!href) return;

  const videoId = getVimeoId(href);
  if (!videoId) {
    if (link) {
      link.setAttribute('href', href);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
    }
    return;
  }

  const iframe = createTag('iframe', {
    src: `https://player.vimeo.com/video/${encodeURIComponent(videoId)}`,
    frameborder: '0',
    allow: 'autoplay; fullscreen; picture-in-picture',
    allowfullscreen: 'true',
    loading: 'lazy',
    title: 'Vimeo video player',
  });

  const wrapper = createTag('div', { class: 'vimeo-wrapper' });
  wrapper.appendChild(iframe);

  if (block.tagName === 'A') {
    const div = createTag('div', { class: 'vimeo' });
    div.appendChild(wrapper);
    if (block.parentNode) block.parentNode.replaceChild(div, block);
  } else {
    block.innerHTML = '';
    block.appendChild(wrapper);
  }
}
