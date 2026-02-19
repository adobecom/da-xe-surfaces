import { createTag, getConfig, getFederatedContentRoot } from '../../utils/utils.js';

let captionsLangMapPromise = null;

const logError = (msg, error) => {
  const errorMsg = `${msg}: ${error}`;
  if (window.lana?.log) {
    window.lana.log(errorMsg);
  } else {
    // eslint-disable-next-line no-console
    console.error(errorMsg);
  }
};

const updateCaptionsLang = (url, geo, captionsLangMap) => {
  if (geo && captionsLangMap) {
    const entry = captionsLangMap.find((l) => l?.geos?.split(',')?.includes(geo));
    if (entry) {
      const captionParam = entry.captions === 'eng' ? entry.captions : `${entry.captions},eng`;
      url.searchParams.set('captions', captionParam);
    }
  }
  return url.toString();
};

const createIframe = (block, href) => {  
  const link = block.tagName === 'A' ? block : block.querySelector('a');
  const videoHref = href || (link && link.href);

  // Extract height class from block or parent (for auto-blocks, height is on parent div)
  let heightClass = null;
  if (block.tagName !== 'A') {
    // Regular block: height class is on the block itself
    const classes = [...block.classList];
    heightClass = classes.find(c => c.match(/^height-\d+$/));
  } else {
    // Auto-block: check parent element for height class
    const parent = block.parentElement;
    if (parent && parent.classList) {
      const parentClasses = [...parent.classList];
      heightClass = parentClasses.find(c => c.match(/^height-\d+$/));
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

  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://video.tv.adobe.com' || !event.data) return;
    const { state, id } = event.data;
    if (!['play', 'pause'].includes(state)
      || !Number.isInteger(id)
      || !iframe.src.startsWith(`${event.origin}/v/${id}`)) return;

    iframe.setAttribute('data-playing', state === 'play');
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

const createIframeWithCaptions = (block, url, geo) => {
  if (!captionsLangMapPromise) {
    createIframe(block);
  } else {
    captionsLangMapPromise?.then((resp) => {
      if (resp?.data) {
        const videoHref = updateCaptionsLang(url, geo, resp.data);
        createIframe(block, videoHref);
      } else {
        createIframe(block);
      }
    }).catch((e) => {
      logError('Could not get atv captions', e);
      createIframe(block);
    });
  }
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
    const url = new URL(link.href);
    const { atvCaptionsKey, locale } = getConfig();
    const geo = (locale?.prefix || '').replace('/langstore', '').replace('/', '');
    const federalCR = atvCaptionsKey && getFederatedContentRoot();

    if (geo && federalCR && url.searchParams.has('captions')) {
      if (!captionsLangMapPromise) {
        const captionsUrl = `${federalCR}/federal/assets/data/adobetv-captions.json?sheet=${atvCaptionsKey}`;
        captionsLangMapPromise = fetch(captionsUrl).then((res) => {
          if (!res.ok) {
            return new Promise(() => { throw new Error(`Failed to fetch ${captionsUrl}`); });
          }
          return res.json();
        });
      }
      createIframeWithCaptions(block, url, geo);
    } else {
      createIframe(block);
    }
  } catch (error) {
    logError('AdobeTV init', error);
  }
}
