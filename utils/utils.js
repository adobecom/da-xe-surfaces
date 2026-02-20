const LOCAL_BLOCKS = [
  'adobe-tv',
  'button',
  'row-card',
  'text',
  'page-metadata',
  'section-metadata',
  'url-metadata',
  'video',
];


const AUTO_BLOCKS = [

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

/** URL metadata: shorthand → { ccwebstage?, ccwebprod?, ccdstage?, ccdprod?, sso? }. Keys come from block classes. Populated by url-metadata block(s); entries merge when same shorthand. */
let urlMetadataMap = new Map();

export function setUrlMetadata(entries) {
  if (!entries || typeof entries !== 'object') return;
  Object.entries(entries).forEach(([key, val]) => {
    const k = key.trim().toLowerCase();
    const existing = urlMetadataMap.get(k);
    const merged = existing && typeof existing === 'object' && typeof val === 'object'
      ? { ...existing, ...val }
      : val;
    urlMetadataMap.set(k, merged);
  });
}

/**
 * Get the full url-metadata entry for a shorthand (URL slots + optional sso).
 * Entry keys are slot names from block classes: ccwebstage, ccwebprod, ccdstage, ccdprod, sso (object).
 * @param {string} shorthand - Key from url-metadata (e.g. 'openFireflyOnWeb')
 * @returns {{ ccwebstage?: string, ccwebprod?: string, ccdstage?: string, ccdprod?: string, sso?: Record<string, string> }|null}
 */
export function getUrlMetadataEntry(shorthand) {
  if (!shorthand?.trim()) return null;
  return urlMetadataMap.get(shorthand.trim().toLowerCase()) || null;
}

/** Slot name for current env: ccwebstage | ccwebprod | ccdstage | ccdprod (matches block class names). */
function getCurrentUrlSlot() {
  const { hostname } = window.location;
  const isStage = hostname.includes('stage') || hostname.includes('localhost');
  const isCcd = hostname.includes('ccd');
  return (isCcd ? 'ccd' : 'ccweb') + (isStage ? 'stage' : 'prod');
}

/**
 * Resolve a URL shorthand to the full URL for the current environment and host.
 * Uses url-metadata map; entry keys are slot names from block classes (ccwebstage, ccwebprod, ccdstage, ccdprod, ssodetails).
 * @param {string} shorthand - Key from url-metadata (e.g. 'openFireflyOnWeb')
 * @returns {string|null} Resolved URL or null if not found
 */
export function getResolvedUrl(shorthand) {
  const entry = getUrlMetadataEntry(shorthand);
  if (!entry || typeof entry !== 'object') return null;
  const slot = getCurrentUrlSlot();
  const url = entry[slot];
  return typeof url === 'string' ? url.trim() : null;
}

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




export async function decorateLinks(el) {
  const anchors = el.getElementsByTagName('a');
  
  const links = [...anchors].reduce((rdx, a) => {
    // Extract attributes using pipe syntax: "Text | Aria label"
    // Maps to: aria-label, data-content-id, data-content-name
    const textContent = a.textContent || '';
    if (textContent.includes('|')) {
      const parts = textContent.split('|').map(p => p.trim());
      if (parts.length > 1) {
        a.setAttribute('aria-label', parts[1]);
        
        // Remove the attribute parts from all text nodes
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

    return rdx;
  }, []);
  return links;
}

/**
 * Resolve link hrefs that use url-metadata shorthand: "shorthand | data-content-id | data-content-name".
 * Call after url-metadata block(s) have run so getResolvedUrl() can resolve the shorthand.
 * @param {Document|Element} area - Root to search for anchors (default document)
 */
export function resolveLinkHrefs(area = document) {
  const root = area === document ? document.body : area;
  const anchors = root.querySelectorAll ? root.querySelectorAll('a[href]') : [];
  anchors.forEach((a) => {
    let href = a.getAttribute('href');
    if (!href) return;
    try {
      href = decodeURIComponent(href);
    } catch (e) {
      // leave href as-is if decoding fails (e.g. malformed %)
    }
    // Support both " | " and encoded "%20%7C%20" / " %7C " so pipe-in-href works when encoded
    const pipeSplit = href.includes(' | ') ? ' | ' : (href.includes('%20%7C%20') ? '%20%7C%20' : (href.includes(' %7C ') ? ' %7C ' : null));
    let shorthand = null;
    if (pipeSplit) {;
    const parts = href.split(pipeSplit).map((p) => p.trim());
    shorthand = parts[0];
    if (parts[1]) a.setAttribute('data-content-id', parts[1]);
    if (parts[2]) a.setAttribute('data-content-name', parts[2]);
  } else if (urlMetadataMap.has(href.trim().toLowerCase())) {
     shorthand = href.trim().toLowerCase();
  } else {
    return;
  }
  const resolved = getResolvedUrl(shorthand);
  if (resolved) {
    a.href = resolved;
  }

  });
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
 * Resolve an icon by name from docs/library/icons. Use in blocks (e.g. row-card).
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
  await Promise.all([
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

  // Load url-metadata so shorthand→URL map is ready before resolving link hrefs
  const urlMetaBlocks = sections.flatMap((s) => s.blocks).filter((b) => b.classList?.[0] === 'url-metadata');
  await Promise.all(urlMetaBlocks.map((b) => loadBlock(b)));
  resolveLinkHrefs(area === document ? document.body : area);

  const areaBlocks = [];
  for (const section of sections) {
    const sectionBlocks = await processSection(section, config, isDoc);
    areaBlocks.push(...sectionBlocks);

    areaBlocks.forEach((block) => {
      if (!block.className.includes('metadata')) block.dataset.block = '';
    });
  }

  const currentHash = window.location.hash;
  if (currentHash) {
    scrollToHashedElement(currentHash);
  }
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
