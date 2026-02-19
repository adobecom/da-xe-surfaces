const LOCAL_BLOCKS = [
  'button',
  'font',
  'fragment',
  'hva-card',
  'page-metadata',
  'section-metadata',
  'video',
];

const AUTO_BLOCKS = [
  { adobetv: 'tv.adobe.com' },
];

const DO_NOT_INLINE = [
  'accordion',
  'columns',
  'z-pattern',
];

const PAGE_URL = new URL(window.location.href);
const LANGSTORE = 'langstore';
const PREVIEW = 'target-preview';

const SLD = PAGE_URL.hostname.includes('.aem.') ? 'aem' : 'hlx';

const ENVS = {
  stage: {
    name: 'stage',
    ims: 'stg1',
  },
  prod: {
    name: 'prod',
    ims: 'prod',
  },
};
ENVS.local = {
  ...ENVS.stage,
  name: 'local',
};

function getLocale(locales, pathname = window.location.pathname) {
  if (!locales) {
    return { ietf: 'en-US', tk: 'hah7vzn.css', prefix: '' };
  }
  const split = pathname.split('/');
  const localeString = split[1];
  let locale = locales[localeString] || locales[''];
  if ([LANGSTORE, PREVIEW].includes(localeString)) {
    const ietf = Object.keys(locales).find((loc) => locales[loc]?.ietf?.startsWith(split[2]));
    if (ietf) locale = locales[ietf];
    locale.prefix = `/${localeString}/${split[2]}`;
    return locale;
  }
  const isUS = locale.ietf === 'en-US';
  locale.prefix = isUS ? '' : `/${localeString}`;
  locale.region = isUS ? 'us' : localeString.split('_')[0];
  return locale;
}

function getEnv(conf) {
  const { host } = window.location;
  const query = PAGE_URL.searchParams.get('env');

  if (query) return { ...ENVS[query], consumer: conf[query] };

  const { clientEnv } = conf;
  if (clientEnv) return { ...ENVS[clientEnv], consumer: conf[clientEnv] };

  if (host.includes('localhost')) return { ...ENVS.local, consumer: conf.local };
  return { ...ENVS.prod, consumer: conf.prod };
  /* c8 ignore stop */
}

export function getMetadata(name, doc = document) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = doc.head.querySelector(`meta[${attr}="${name}"]`);
  return meta && meta.content;
}

function setupMiloObj(config) {
  window.milo ||= {};
  window.milo.deferredPromise = new Promise((resolve) => {
    config.resolveDeferred = resolve;
  });
}

const handleEntitlements = (() => {
  const { martech } = Object.fromEntries(PAGE_URL.searchParams);
  if (martech === 'off') return () => { };
  let entResolve;
  const entPromise = new Promise((resolve) => {
    entResolve = resolve;
  });

  return (resolveVal) => {
    if (resolveVal !== undefined) {
      entResolve(resolveVal);
    }
    return entPromise;
  };
})();

export const [setConfig, getConfig] = (() => {
  let config = {};
  return [
    (conf) => {
      window.hlx = window.hlx || {};
      window.hlx.config = conf;

      const origin = conf.origin || window.location.origin;
      const pathname = conf.pathname || window.location.pathname;
      config = { env: getEnv(conf), ...conf };
      config.codeRoot = conf.codeRoot ? `${origin}${conf.codeRoot}` : origin;
      config.base = config.miloLibs || config.codeRoot;
      config.locale = pathname ? getLocale(conf.locales, pathname) : getLocale(conf.locales);
      config.autoBlocks = conf.autoBlocks ? [...AUTO_BLOCKS, ...conf.autoBlocks] : AUTO_BLOCKS;
      config.signInContext = conf.signInContext || {};
      config.doNotInline = conf.doNotInline
        ? [...DO_NOT_INLINE, ...conf.doNotInline]
        : DO_NOT_INLINE;
      const lang = getMetadata('content-language') || config.locale.ietf;
      document.documentElement.setAttribute('lang', lang);
      try {
        const dir = getMetadata('content-direction')
          || config.locale.dir
          || (config.locale.ietf && (new Intl.Locale(config.locale.ietf)?.textInfo?.direction))
          || 'ltr';
        document.documentElement.setAttribute('dir', dir);
      } catch (e) {
        console.log('Invalid or missing locale:', e);
      }
      config.locale.contentRoot = `${origin}${config.locale.prefix}${config.contentRoot ?? ''}`;
      config.useDotHtml = !PAGE_URL.origin.includes(`.${SLD}.`)
        && (conf.useDotHtml ?? PAGE_URL.pathname.endsWith('.html'));
      config.entitlements = handleEntitlements;
      config.consumerEntitlements = conf.entitlements || [];
      setupMiloObj(config);
      return config;
    },
    () => config,
  ];
})();

export function decorateImageLinks(el) {
  const images = el.querySelectorAll('img[alt*="|"]');
  if (!images.length) return;
  [...images].forEach((img) => {
    const [source, alt, icon] = img.alt.split('|');
    try {
      const url = new URL(source.trim());
      const href = url.hostname.includes(`.${SLD}.`) ? `${url.pathname}${url.hash}` : url.href;
      if (alt?.trim().length) img.alt = alt.trim();
      const pic = img.closest('picture');
      const picParent = pic.parentElement;
      if (href.includes('.mp4')) {
        const a = createTag('a', { href: url, 'data-video-poster': pic.outerHTML });
        a.innerHTML = url;
        pic.replaceWith(a);
      } else {
        const aTag = createTag('a', { href, class: 'image-link' });
        picParent.insertBefore(aTag, pic);
        if (icon) {
        } else {
          aTag.append(pic);
        }
      }
    } catch (e) {
      console.log('Error:', `${e.message} '${source.trim()}'`);
    }
  });
}

export function appendHtmlToLink(link) {
  const { useDotHtml } = getConfig();
  if (!useDotHtml) return;
  const href = link.getAttribute('href');
  if (!href?.length) return;

  const { autoBlocks = [], htmlExclude = [] } = getConfig();

  const HAS_EXTENSION = /\..*$/;
  let url = { pathname: href };

  try { url = new URL(href, PAGE_URL); } catch (e) { /* do nothing */ }

  if (!(href.startsWith('/') || href.startsWith(PAGE_URL.origin))
    || url.pathname?.endsWith('/')
    || href === PAGE_URL.origin
    || HAS_EXTENSION.test(href.split('/').pop())
    || htmlExclude?.some((excludeRe) => excludeRe.test(href))) {
    return;
  }

  const relativeAutoBlocks = autoBlocks
    .map((b) => Object.values(b)[0])
    .filter((b) => b.startsWith('/'));
  const isAutoblockLink = relativeAutoBlocks.some((block) => href.includes(block));
  if (isAutoblockLink) return;

  try {
    const linkUrl = new URL(href.startsWith('http') ? href : `${PAGE_URL.origin}${href}`);
    if (linkUrl.pathname && !linkUrl.pathname.endsWith('.html')) {
      linkUrl.pathname = `${linkUrl.pathname}.html`;
      link.setAttribute('href', href.startsWith('/')
        ? `${linkUrl.pathname}${linkUrl.search}${linkUrl.hash}`
        : linkUrl.href);
    }
  } catch (e) {
    window.lana?.log(`Error while attempting to append '.html' to ${link}: ${e}`);
  }
}

export function decorateSVG(a) {
  const { textContent, href } = a;
  if (!(textContent.includes('.svg') || href.includes('.svg'))) return a;
  try {
    // Mine for URL and alt text
    const splitText = textContent.split('|');
    const authoredUrl = new URL(splitText.shift().trim());
    const altText = splitText.join('|').trim();

    // Relative link checking
    const hrefUrl = a.href.startsWith('/')
      ? new URL(`${window.location.origin}${a.href}`)
      : new URL(a.href);

    const src = (authoredUrl.hostname.includes('.hlx.') || authoredUrl.hostname.includes('.aem.'))
      ? authoredUrl.pathname
      : authoredUrl;

    const img = createTag('img', { loading: 'lazy', src, alt: altText || '' });
    const pic = createTag('picture', null, img);

    if (authoredUrl.pathname === hrefUrl.pathname) {
      a.parentElement.replaceChild(pic, a);
      return pic;
    }
    a.textContent = '';
    a.append(pic);
    return a;
  } catch (e) {
    console.log('Failed to create SVG.', e.message);
    return a;
  }
}

export function decorateAutoBlock(a) {
  const config = getConfig();
  const { hostname } = window.location;
  let url;
  try {
    url = new URL(a.href);
  } catch (e) {
    window.lana?.log(`Cannot make URL from decorateAutoBlock - ${a?.href}: ${e.toString()}`);
    return false;
  }

  const href = hostname === url.hostname
  ? `${url.pathname}${url.search}${url.hash}`
  : a.href;

  return config.autoBlocks.find((candidate) => {
    const key = Object.keys(candidate)[0];
    const match = href.includes(candidate[key]);
    if (!match) return false;

    if (key === 'pdf-viewer' && !a.textContent.includes('.pdf')) {
      a.target = '_blank';
      return false;
    }

    const hasExtension = a.href.split('/').pop().includes('.');
    const mp4Match = a.textContent.match('media_.*.mp4');
    if (key === 'fragment' && (!hasExtension || mp4Match)) {
      if (a.href === window.location.href) {
        return false;
      }

      const isInlineFrag = url.hash.includes('#_inline');
      if (url.hash === '' || isInlineFrag) {
        const { parentElement } = a;
        const { nodeName, innerHTML } = parentElement;
        const noText = innerHTML === a.outerHTML;
        if (noText && nodeName === 'P') {
          const div = createTag('div', null, a);
          parentElement.parentElement.replaceChild(div, parentElement);
        }
      }

      // previewing a fragment page with mp4 video
      if (mp4Match) {
        a.className = 'video link-block';
        return false;
      }

      // Modals
      if (url.hash !== '' && !isInlineFrag) {
        a.dataset.modalPath = url.pathname;
        a.dataset.modalHash = url.hash;
        a.href = url.hash;
        a.className = `modal link-block ${[...a.classList].join(' ')}`;
        return true;
      }
    }

    // slack uploaded mp4s
    if (key === 'video' && !a.textContent.match('media_.*.mp4')) {
      return false;
    }

    a.className = `${key} link-block`;
    return true;
  });
}

let urlMappingCache = null;
let urlMappingPromise = null;

/**
 * Load URL shorthand mapping JSON for the current page
 * @returns {Promise<Object>} Mapping object with shorthand -> ccweb URL
 */
async function loadUrlMapping() {
  if (urlMappingCache) return urlMappingCache;
  if (urlMappingPromise) return urlMappingPromise;

  urlMappingPromise = (async () => {
    try {
      const path = window.location.pathname;
      if (path.includes('/blocks/')) return {};
      const pathParts = path.split('/').filter(Boolean);
      const pageName = pathParts.pop()?.replace('.html', '') || 'index';
      const basePath = pathParts.length ? `/${pathParts.join('/')}/` : '/';
      const mappingUrl = `${basePath}${pageName}-url-shorthand-mapping.json`;
      
      const response = await fetch(mappingUrl);
      if (!response.ok) {
        return {};
      }
      
      const json = await response.json();
      // Convert array format to object for easy lookup
      const mapping = {};
      if (json.data && Array.isArray(json.data)) {
        json.data.forEach((item) => {
          if (item.shorthand && item.ccweb) {
            mapping[item.shorthand] = item.ccweb;
          }
        });
      }
      
      urlMappingCache = mapping;
      return mapping;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load URL mapping:', error);
      return {};
    }
  })();

  return urlMappingPromise;
}

/** True if href looks like a shorthand (no protocol, not path, not hash/mailto/tel). */
function isShorthandHref(href) {
  if (!href || typeof href !== 'string') return false;
  const h = href.trim();
  return !(h.startsWith('http://') || h.startsWith('https://') || h.startsWith('/')
    || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:'));
}

/**
 * Resolve a shorthand to its actual URL. Only call when isShorthandHref(href).
 * @param {string} href - Shorthand value
 * @returns {Promise<string>} Resolved URL or original
 */
async function resolveShorthandUrl(href) {
  if (!isShorthandHref(href)) return href;
  const mapping = await loadUrlMapping();
  return mapping[href] || href;
}

export async function decorateLinks(el) {
  const config = getConfig();
  decorateImageLinks(el);
  const anchors = el.getElementsByTagName('a');
  const { hostname, href } = window.location;
  
  const resolvePromises = [...anchors].map(async (a) => {
    const originalHref = a.getAttribute('href');
    if (originalHref && isShorthandHref(originalHref)) {
      const resolvedHref = await resolveShorthandUrl(originalHref);
      if (resolvedHref !== originalHref) {
        a.href = resolvedHref;
      }
    }
  });
  await Promise.all(resolvePromises);
  
  const links = [...anchors].reduce((rdx, a) => {
    decorateSVG(a);
    if (a.href.includes('#_blank')) {
      a.setAttribute('target', '_blank');
      a.href = a.href.replace('#_blank', '');
    }
    if (a.href.includes('#_dnb')) {
      a.href = a.href.replace('#_dnb', '');
    } else {
      const autoBlock = decorateAutoBlock(a);
      if (autoBlock) {
        rdx.push(a);
      }
    }
    // Extract attributes using pipe syntax: "Text | aria: Label | id: hero-cta | name: Get Started"
    // Maps to: aria-label, data-content-id, data-content-name
    const textContent = a.textContent || '';
    if (textContent.includes('|')) {
      const parts = textContent.split('|').map(p => p.trim());
      if (parts.length > 1) {
        let hasAttributes = false;
        
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          
          const ariaMatch = part.match(/^aria\s*:\s*(.+)$/i);
          if (ariaMatch) {
            a.setAttribute('aria-label', ariaMatch[1].trim());
            hasAttributes = true;
            continue;
          }
          
          const idMatch = part.match(/^id\s*:\s*(.+)$/i);
          if (idMatch) {
            a.setAttribute('data-content-id', idMatch[1].trim());
            hasAttributes = true;
            continue;
          }
          
          const nameMatch = part.match(/^name\s*:\s*(.+)$/i);
          if (nameMatch) {
            a.setAttribute('data-content-name', nameMatch[1].trim());
            hasAttributes = true;
          }
        }
        
        // Remove the attribute parts from all text nodes
        if (hasAttributes) {
          const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
          let node;
          while (node = walker.nextNode()) {
            if (node.textContent.includes('|')) {
              const pipeIndex = node.textContent.indexOf('|');
              node.textContent = node.textContent.substring(0, pipeIndex).trim();
              break;
            }
          }
        }
      }
    }

    return rdx;
  }, []);
  return links;
}

export function filterDuplicatedLinkBlocks(blocks) {
  if (!blocks?.length) return [];
  const uniqueModalKeys = new Set();
  const uniqueBlocks = [];
  for (const obj of blocks) {
    if (obj.className.includes('modal')) {
      const key = `${obj.dataset.modalHash}-${obj.dataset.modalPath}`;
      if (!uniqueModalKeys.has(key)) {
        uniqueModalKeys.add(key);
        uniqueBlocks.push(obj);
      }
    } else {
      uniqueBlocks.push(obj);
    }
  }
  return uniqueBlocks;
}

/**
 * Get all options from block classes with a given prefix, e.g. getBlockOptions(block, 'cta')
 * finds ctavariant-accent, ctasize-m and returns { variant: 'accent', size: 'm' }.
 * Matches case-insensitively.
 * @param {Element} block - Block element
 * @param {string} prefix - Class prefix (e.g. 'cta')
 * @returns {Record<string, string>} Object of key/value from prefixkey-value classes
 */
export function getBlockOptions(block, prefix) {
  const pre = prefix.toLowerCase();
  const result = {};
  (block.classList || []).forEach((c) => {
    if (c.length <= pre.length || !c.toLowerCase().startsWith(pre)) return;
    const rest = c.slice(pre.length); // e.g. "variant-accent", "size-m"
    const dash = rest.indexOf('-');
    if (dash < 0) return;
    const key = rest.slice(0, dash);
    const value = rest.slice(dash + 1);
    if (key && value) result[key] = value;
  });
  return result;
}

async function decorateSection(section, idx) {
  let links = await decorateLinks(section);
  // decorateDefaults(section);
  const blocks = section.querySelectorAll(':scope > div[class]:not(.content)');
  blocks.forEach((el) => { if (!el.classList.contains('block')) el.classList.add('block'); });

  const { doNotInline } = getConfig();
  const blockLinks = [...blocks].reduce((blkLinks, block) => {
    const blockName = block.classList[0];
    links.filter((link) => block.contains(link))
      .forEach((link) => {
        if (link.classList.contains('fragment')
          && LOCAL_BLOCKS.includes(blockName) // do not inline consumer blocks (for now)
          && !doNotInline.includes(blockName)) {
          if (!link.href.includes('#_inline')) {
            link.href = `${link.href}#_inline`;
          }
          blkLinks.inlineFrags.push(link);
        } else if (link.classList.contains('link-block')) {
          blkLinks.autoBlocks.push(link);
        }
      });
    return blkLinks;
  }, { inlineFrags: [], autoBlocks: [] });

  const embeddedLinks = [...blockLinks.inlineFrags, ...blockLinks.autoBlocks];
  if (embeddedLinks.length) {
    links = links.filter((link) => !embeddedLinks.includes(link));
  }
  section.className = 'section';
  section.dataset.status = 'decorated';
  section.dataset.idx = idx;
  return {
    blocks: [...links, ...blocks],
    el: section,
    idx,
    preloadLinks: filterDuplicatedLinkBlocks(blockLinks.autoBlocks),
  };
}

async function resolveInlineFrags(section) {
  const inlineFrags = [...section.el.querySelectorAll('a[href*="#_inline"]')];
  if (!inlineFrags.length) return;
  const { default: loadInlineFrags } = await import('../blocks/fragment/fragment.js');
  const fragPromises = inlineFrags.map((link) => loadInlineFrags(link));
  await Promise.all(fragPromises);
  const newlyDecoratedSection = await decorateSection(section.el, section.idx);
  section.blocks = newlyDecoratedSection.blocks;
  section.preloadLinks = newlyDecoratedSection.preloadLinks;
}


const findReplaceableNodes = (area) => {
  const regex = /{{(.*?)}}|%7B%7B(.*?)%7D%7D/g;
  const walker = document.createTreeWalker(area, NodeFilter.SHOW_ALL);
  const nodes = [];
  let node = walker.nextNode();
  while (node !== null) {
    let matchFound = false;
    if (node.nodeType === Node.TEXT_NODE) {
      matchFound = regex.test(node.nodeValue);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('href')) {
      const hrefValue = node.getAttribute('href');
      matchFound = regex.test(hrefValue);
    }
    if (matchFound) {
      nodes.push(node);
      regex.lastIndex = 0;
    }
    node = walker.nextNode();
  }
  return nodes;
};



let placeholderRequest;
export async function decoratePlaceholders(area, config) {
  if (!area) return;
  const nodes = findReplaceableNodes(area);
  if (!nodes.length) return;
  area.dataset.hasPlaceholders = 'true';
  const placeholderPath = `${config.locale?.contentRoot}/placeholders.json`;
  placeholderRequest = placeholderRequest
    || customFetch({ resource: placeholderPath, withCacheRules: true })
      .catch(() => ({}));
}

export function loadLink(href, { as, callback, crossorigin, rel, fetchpriority } = {}) {
  let link = document.head.querySelector(`link[href="${href}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    if (as) link.setAttribute('as', as);
    if (crossorigin) link.setAttribute('crossorigin', crossorigin);
    if (fetchpriority) link.setAttribute('fetchpriority', fetchpriority);
    link.setAttribute('href', href);
    if (callback) {
      link.onload = (e) => callback(e.type);
      link.onerror = (e) => callback(e.type);
    }
    document.head.appendChild(link);
  } else if (callback) {
    callback('noop');
  }
  return link;
}

export function loadStyle(href, callback) {
  if (window.app && window.app.BUILD_MODE === "builtin") {
    return null;
  }
  return loadLink(href, { rel: 'stylesheet', callback });
}

/** Parse icon-* class value into name and optional size (e.g. "chevron-right-s" -> { name: "chevron-right", size: "s" }). */
export function parseIconClass(value) {
  if (!value) return { name: '', size: undefined };
  const sizes = ['xxl', 'xl', 'l', 'm', 's'];
  for (const size of sizes) {
    const suffix = `-${size}`;
    if (value.endsWith(suffix)) {
      return { name: value.slice(0, -suffix.length), size };
    }
  }
  return { name: value, size: undefined };
}

/** Spectrum icon size CSS variables (same as sp-icon). */
const SPECTRUM_ICON_SIZE_VAR = {
  s: 'var(--spectrum-workflow-icon-size-75)',
  m: 'var(--spectrum-workflow-icon-size-100)',
  l: 'var(--spectrum-workflow-icon-size-200)',
  xl: 'var(--spectrum-workflow-icon-size-300)',
  xxl: 'var(--spectrum-workflow-icon-size-xxl)',
};

function applyIconSizeToSvg(svg, size) {
  if (!svg || !size || !SPECTRUM_ICON_SIZE_VAR[size]) return;
  const sizeVar = SPECTRUM_ICON_SIZE_VAR[size];
  svg.style.width = sizeVar;
  svg.style.height = sizeVar;
  svg.setAttribute('data-icon-size', size);
}

/** Cache for fetched content icons (iconName -> SVG element). */
const contentIconCache = new Map();

/**
 * Fetch and parse an SVG from the given URL. Returns the SVG element or null.
 * @param {string} url - Full URL to the SVG
 * @param {string} iconName - Name used for cache key
 * @returns {Promise<SVGElement|null>}
 */
async function fetchAndParseSVG(url, iconName) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  svg.setAttribute('data-icon', iconName);
  return document.adoptNode(svg);
}

/**
 * Fetch an icon SVG from the current site's docs/library/icons (e.g. when not in Spectrum).
 * Uses config base/contentRoot; path is {base}/docs/library/icons/{iconName}.svg.
 * Results are cached by iconName. Callers receive a clone so the icon can be appended safely.
 * @param {string} iconName - Icon name without extension (e.g. 'search', 'chevron-right')
 * @returns {Promise<SVGElement|null>} A clone of the SVG element, or null if fetch/parse fails
 */
export async function fetchContentIcon(iconName) {
  if (!iconName?.trim()) return null;
  const key = iconName.trim();
  if (contentIconCache.has(key)) return contentIconCache.get(key).cloneNode(true);
  const config = getConfig();
  const bases = [
    (config.base || config.contentRoot || '').toString().replace(/\/$/, ''),
    window.location.origin,
  ].filter(Boolean);
  for (const base of bases) {
    const path = `${base}/docs/library/icons/${key}.svg`;
    try {
      const svgElement = await fetchAndParseSVG(path, key);
      if (svgElement) {
        contentIconCache.set(key, svgElement);
        return svgElement.cloneNode(true);
      }
    } catch {
      /* try next base */
    }
  }
  return null;
}

async function decorateIcons(area, config) {
  const icons = area.querySelectorAll('span.icon');
  if (icons.length === 0) return;
  const { iconsExcludeBlocks } = config;
  if (iconsExcludeBlocks) {
    const excludedIconsCount = [...icons].filter((icon) => iconsExcludeBlocks.some((block) => icon.closest(`div.${block}`))).length;
    if (excludedIconsCount === icons.length) return;
  }
  for (const span of icons) {
    const iconClass = [...(span.classList || [])].find((c) => c.startsWith('icon-'))?.slice(5) ?? '';
    const { name, size } = parseIconClass(iconClass);
    if (!name) continue;
    const svg = await fetchContentIcon(name);
    if (svg) {
      applyIconSizeToSvg(svg, size);
      const label = span.getAttribute('aria-label');
      if (label) svg.setAttribute('aria-label', label);
      span.replaceWith(svg);
    } else {
      console.warn(`Icon "${name}" not found in library.`);
    }
  }
}

/**
 * Resolve an icon by name from docs/library/icons. Use in blocks (e.g. hva-card).
 * @param {string} name - Icon name without extension (e.g. 'search', 'chevron-down')
 * @param {{ size?: string, label?: string }} [options] - Optional size (s|m|l|xl|xxl) and aria-label
 * @returns {Promise<SVGElement|null>} The icon SVG or null
 */
export async function resolveIcon(name, options = {}) {
  if (!name?.trim()) return null;
  const n = name.trim();
  const { size, label } = options;
  const svg = await fetchContentIcon(n);
  if (svg) {
    applyIconSizeToSvg(svg, size);
    if (label) svg.setAttribute('aria-label', label);
    return svg;
  }
  return null;
}

/**
 * Loads a CSS file.
 * @param {string} href URL to the CSS file
 */
async function loadCSS(href) {
  if (window.app && window.app.BUILD_MODE === "builtin") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (!document.querySelector(`head > link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.append(link);
    } else {
      resolve();
    }
  });
}

/**
 * Loads JS and CSS for a block.
 * @param {Element} block The block element
 */
export async function loadBlock(block) {
  const status = block.dataset.blockStatus;
  if (status !== 'loading' && status !== 'loaded') {
    block.dataset.blockStatus = 'loading';
    const { blockName } = (!block.dataset || !block.dataset.blockName) ? { blockName: block.classList[0] } : block.dataset;
    try {
      const cssLoaded = loadCSS(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`);
      const decorationComplete = new Promise((resolve) => {
        (async () => {
          try {
            const mod = await import(
              `../blocks/${blockName}/${blockName}.js`
            );
            if (mod.default) {
              await mod.default(block);
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.log(`failed to load module for ${blockName}`, error);
          }
          resolve();
        })();
      });
      await Promise.all([cssLoaded, decorationComplete]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`failed to load block ${blockName}`, error);
    }
    block.dataset.blockStatus = 'loaded';
  }
  return block;
}

export function partition(arr, fn) {
  return arr.reduce(
    (acc, val, i, ar) => {
      acc[fn(val, i, ar) ? 0 : 1].push(val);
      return acc;
    },
    [[], []],
  );
}


async function processSection(section, config, isDoc) {
  await resolveInlineFrags(section);
  await Promise.all([
    decoratePlaceholders(section.el, config),
    decorateIcons(section.el, config),
  ]);
  const loadBlocks = [];
  if (section.preloadLinks.length) {
    const [modals, blocks] = partition(section.preloadLinks, (block) => block.classList.contains('modal'));
    await Promise.all(blocks.map((block) => loadBlock(block)));
    modals.forEach((block) => loadBlock(block));
  }

  section.blocks.forEach((block) => loadBlocks.push(loadBlock(block)));

  // Only move on to the next section when all blocks are loaded.
  await Promise.all(loadBlocks);

  delete section.el.dataset.status;
  delete section.el.dataset.idx;
  return section.blocks;
}

async function decorateSections(el, isDoc) {
  const selector = isDoc ? 'body > main > div' : ':scope > div';
  const sectionElements = [...el.querySelectorAll(selector)];
  return Promise.all(sectionElements.map((section, idx) => decorateSection(section, idx)));
}

export async function loadArea(area = document) {
  const isDoc = area === document;
  const config = getConfig();
  const sections = await decorateSections(area, isDoc);

  // Apply page-metadata first so body classes/styles are set before other blocks
  const pageMetaBlocks = sections.flatMap((s) => s.blocks).filter((b) => b.classList?.[0] === 'page-metadata');
  await Promise.all(pageMetaBlocks.map((b) => loadBlock(b)));

  const areaBlocks = [];
  for (const section of sections) {
    const sectionBlocks = await processSection(section, config, isDoc);
    areaBlocks.push(...sectionBlocks);

    areaBlocks.forEach((block) => {
      if (!block.className.includes('metadata')) block.dataset.block = '';
    });
  }

  // const currentHash = window.location.hash;
  // if (currentHash) {
  //   scrollToHashedElement(currentHash);
  // }
}

export function createTag(tag, attributes, html, options = {}) {
  const el = document.createElement(tag);
  if (html) {
    if (html instanceof HTMLElement
      || html instanceof SVGElement
      || html instanceof DocumentFragment) {
      el.append(html);
    } else if (Array.isArray(html)) {
      el.append(...html);
    } else {
      el.insertAdjacentHTML('beforeend', html);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
  }
  options.parent?.append(el);
  return el;
}

function getExtension(path) {
  const pageName = path.split('/').pop();
  return pageName.includes('.') ? pageName.split('.').pop() : '';
}

export function localizeLink(
  href,
  originHostName = window.location.hostname,
  overrideDomain = false,
) {
  try {
    const url = new URL(href);
    const relative = url.hostname === originHostName;
    const processedHref = relative ? href.replace(url.origin, '') : href;
    const { hash } = url;
    // don't localize links with #_dnt
    if (hash.includes('#_dnt')) return processedHref.replace('#_dnt', '');
    const path = url.pathname;
    const extension = getExtension(path);
    const allowedExts = ['', 'html', 'json'];
    if (!allowedExts.includes(extension)) return processedHref;
    const { locale, locales, prodDomains } = getConfig();
    if (!locale || !locales) return processedHref;
    const isLocalizable = relative || (prodDomains && prodDomains.includes(url.hostname))
      || overrideDomain;
    if (!isLocalizable) return processedHref;
    const isLocalizedLink = path.startsWith(`/${LANGSTORE}`)
      || path.startsWith(`/${PREVIEW}`)
      || Object.keys(locales).some((loc) => loc !== '' && (path.startsWith(`/${loc}/`)
        || path.endsWith(`/${loc}`)));
    if (isLocalizedLink) return processedHref;
    const urlPath = `${locale.prefix}${path}${url.search}${hash}`;
    return relative ? urlPath : `${url.origin}${urlPath}`;
  } catch (error) {
    return href;
  }
}

export async function customFetch({ resource, withCacheRules }) {
  const options = {};
  if (withCacheRules) {
    const params = new URLSearchParams(window.location.search);
    options.cache = params.get('cache') === 'off' ? 'reload' : 'default';
  }

  const baseUrl = new URL(resource);
  // HACK: Adding a forced cache bust to avoid cache issues
  baseUrl.searchParams.set('cb', new Date().getTime());
  const response = await fetch(baseUrl.toString(), options);
  if (!resource.endsWith('.plain.html')) {
    return response;
  }

  const html = await response.text();
  const processedHtml = html.replace(
    /(href|src|srcset)="(\.\/[^"\s]*|\.\.\/[^"\s]*|[^"\/][^"\s]*)"/g,
    (match, attr, path) => {
      if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) {
        return match;
      }
      if (attr === 'srcset') {
        return `srcset="${path
          .split(',')
          .map((url) => {
            const [urlPart, size] = url.trim().split(' ');
            if (urlPart.startsWith('http') || urlPart.startsWith('//') || urlPart.startsWith('data:')) {
              return url;
            }
            return `${new URL(urlPart, baseUrl).href}${size ? ` ${size}` : ''}`;
          })
          .join(', ')}"`;
      }
      return `${attr}="${new URL(path, baseUrl).href}"`;
    }
  );
  return new Response(processedHtml, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export function createIntersectionObserver({ el, callback, once = true, options = {} }) {
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        if (once) observer.unobserve(entry.target);
        callback(entry.target, entry);
      }
    });
  }, options);
  io.observe(el);
  return io;
}

export function isInTextNode(node) {
  return (node.parentElement.childNodes.length > 1 && node.parentElement.firstChild.tagName === 'A') || node.parentElement.firstChild.nodeType === Node.TEXT_NODE;
}

let federatedContentRoot;
export const getFederatedContentRoot = () => {
  if (federatedContentRoot) return federatedContentRoot;

  const cdnWhitelistedOrigins = [
    'https://www.adobe.com',
    'https://business.adobe.com',
    'https://blog.adobe.com',
    'https://milo.adobe.com',
    'https://news.adobe.com',
    'graybox.adobe.com',
  ];
  const { allowedOrigins = [], origin: configOrigin } = getConfig();
  if (federatedContentRoot) return federatedContentRoot;
  // Non milo consumers will have its origin from config
  const origin = configOrigin || window.location.origin;

  const isAllowedOrigin = [...allowedOrigins, ...cdnWhitelistedOrigins].some((o) => {
    const originNoStage = origin.replace('.stage', '');
    return o.startsWith('https://')
      ? originNoStage === o
      : originNoStage.endsWith(o);
  });

  federatedContentRoot = isAllowedOrigin ? origin : 'https://www.adobe.com';

  if (origin.includes('localhost') || origin.includes(`.${SLD}.`)) {
    federatedContentRoot = `https://main--federal--adobecom.aem.${origin.endsWith('.live') ? 'live' : 'page'}`;
  }

  return federatedContentRoot;
};


