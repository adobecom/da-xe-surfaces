import { createTag, XE_SITES_EVENT } from '../../utils/utils.js';

const logError = (msg, error) => {
  const errorMsg = `${msg}: ${error}`;
  if (window.lana?.log) {
    window.lana.log(errorMsg);
  } else {
    // eslint-disable-next-line no-console
    console.error(errorMsg);
  }
};

const createIframe = (block, href) => {
  const link = block.tagName === 'A' ? block : block.querySelector('a');
  const videoHref = href || (link && link.href);

  // Extract height class from block or parent (for auto-blocks, height is on parent div)
  let heightClass = null;
  if (block.tagName !== 'A') {
    // Regular block: height class is on the block itself
    const classes = [...block.classList];
    heightClass = classes.find((c) => c.match(/^height-\d+$/));
  } else {
    // Auto-block: check parent element for height class
    const parent = block.parentElement;
    if (parent && parent.classList) {
      const parentClasses = [...parent.classList];
      heightClass = parentClasses.find((c) => c.match(/^height-\d+$/));
    }
  }

  const iframe = createTag('iframe', {
    src: videoHref,
    class: 'adobetv',
    scrolling: 'no',
    allow: 'encrypted-media; fullscreen',
    title: 'Adobe Video Publishing Cloud Player',
    loading: 'lazy',
  });
  const embed = createTag('div', { class: 'boost-video' }, iframe);

  // Apply height class to embed if found
  if (heightClass) {
    embed.classList.add(heightClass);
  }

  if (block.tagName === 'A') {
    // First call: link → replace with div
    // Preserve height class on the new div if found
    const div = createTag('div', { class: 'adobetv hide-video' });
    if (heightClass) {
      div.classList.add(heightClass);
    }
    div.appendChild(embed);
    if (block.parentNode) block.parentNode.replaceChild(div, block);
  } else {
    // Second call: already a div → update contents
    block.innerHTML = '';
    block.appendChild(embed);
  }

  const idMatch = videoHref.match(/\/v\/(\d+)/);
  const videoId = idMatch ? idMatch[1] : null;

  if (videoId) {
    window.fetch(`https://video.tv.adobe.com/v/${videoId}?format=json-ld`)
      .then((res) => res.json())
      .then(async (info) => {
        const title = info?.jsonLinkedData?.name;
        if (title) iframe.setAttribute('title', title);
        try {
          const { setDialogAndElementAttributes } = await import('../../scripts/accessibility.js');
          setDialogAndElementAttributes({ element: iframe, title });
        } catch {
          // accessibility.js not in project; title already set above
        }
      });
  }

  let lastState = null;
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://video.tv.adobe.com' || !event.data) return;
    if (event.source !== iframe.contentWindow) return;

    const { state, id } = event.data;
    const isPlayState = state === 'play' || state === 'playing';
    const isPauseState = state === 'pause' || state === 'paused';
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const idOk = Number.isInteger(idNum) && iframe.src.startsWith(`${event.origin}/v/${idNum}`);

    if (isPlayState) {
      const wasPlaying = lastState === 'play' || lastState === 'playing';
      if (!wasPlaying) {
        block.dispatchEvent(new CustomEvent(XE_SITES_EVENT, {
          bubbles: true,
          composed: true,
          detail: {
            type: 'analytics',
            subType: 'track',
            data: {
              eventType: 'click',
              subtype: 'video',
              contentAction: videoHref,
            },
          },
        }));
      }
      lastState = 'play';
    } else if (isPauseState) {
      lastState = 'pause';
    }

    if (!(isPlayState || isPauseState) || !idOk) return;

    iframe.setAttribute('data-playing', isPlayState ? 'true' : 'false');
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting && target.getAttribute('data-playing') === 'true') {
        target.contentWindow?.postMessage({ type: 'mpcAction', action: 'pause' }, target.src);
      }
    });
  }, { rootMargin: '0px' });
  io.observe(iframe);
};

export default function init(block) {
  block.classList.add('hide-video');

  // Get the link element (could be the block itself if it's an <a>, or a child link)
  const link = block.tagName === 'A' ? block : block.querySelector('a');

  // Validate the link element and href
  if (!link || !link.href || link.href === 'undefined' || link.href.trim() === '' || !link.href.includes('://')) {
    return;
  }

  try {
    createIframe(block);
  } catch (err) {
    logError('AdobeTV init', err);
  }
}
