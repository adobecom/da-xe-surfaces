/** ***********************************************************************
 *
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 *  NOTICE:  All information contained herein is, and remains
 *  the property of Adobe and its suppliers, if any. The intellectual
 *  and technical concepts contained herein are proprietary to Adobe
 *  and its suppliers and are protected by all applicable intellectual
 *  property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 *  is strictly forbidden unless prior written permission is obtained
 *  from Adobe.
 ************************************************************************* */

/**
 * Parse plain HTML to segments (Milo-style blocks + raw HTML).
 * Reference: nest applets/boost util/parsePlainHtml.ts (poc-blocks-in-nest)
 */
import boostContext from '../context/boostContext.js';
import { extractHrefAndContentId } from './utils.js';
import getTextOverrides from './textBlockLogic.js';

/**
 * Fetch HTML from URL and return document.
 */
export async function fetchPlainHtml(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  const html = await res.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function getTextContent(el) {
  return el.textContent?.trim() ?? '';
}

function getTextAndAriaLabel(el) {
  const text = getTextContent(el);
  const [textPart = '', ariaLabelPart = ''] = text.split('|');
  return { text: textPart.trim(), ariaLabel: ariaLabelPart.trim() };
}

function hasText(el) {
  return getTextContent(el).length > 0;
}

function getClassName(el) {
  const c = el.getAttribute('class')?.trim();
  return c && c.length > 0 ? c : undefined;
}

/**
 * Resolve relative URL against base. If url is already absolute, return as-is.
 */
function resolveUrl(url, base) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return url;
  }
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/** Allowed attributes on generic (host) elements to preserve classes, styles,
 * and safe semantics. */
const ALLOWED_HOST_ATTRS = new Set([
  'class',
  'id',
  'style',
  'href',
  'src',
  'alt',
  'title',
  'role',
  'width',
  'height',
  'loading',
]);

function getSafeAttrs(el, baseUrl = '') {
  const attrs = {};
  const allowed = ALLOWED_HOST_ATTRS;
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    if (!a) {
      continue;
    }
    const name = a.name.toLowerCase();
    if (!allowed.has(name) && !name.startsWith('data-')) {
      continue;
    }
    let { value } = a;
    if ((name === 'href' || name === 'src') && value && baseUrl) {
      if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
        value = resolveUrl(value, baseUrl);
      }
    }
    attrs[name] = value;
  }
  return attrs;
}

/** Forward declaration for mutual recursion with domToContentNodes. */
// eslint-disable-next-line prefer-const -- assigned below after domToContentNodes is defined
let blockElementToNodes;

/**
 * Convert an element's child nodes to ContentNode[] (for host/generic elements).
 * Recursively uses blockElementToNodes for element children so nested structure is preserved.
 */
function domToContentNodes(parentEl, baseUrl, headingSize, bodySize) {
  const out = [];
  for (let i = 0; i < parentEl.childNodes.length; i++) {
    const node = parentEl.childNodes[i];
    if (node?.nodeType === Node.TEXT_NODE) {
      const value = node.textContent?.trim();
      if (value) {
        out.push({ type: 'text', value });
      }
      continue;
    }
    if (node?.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }
    out.push(...blockElementToNodes(node, headingSize, bodySize, baseUrl));
  }
  return out;
}

/**
 * Find block root elements: outermost divs that have class "text", "html", "adobetv", "row-card",
 * "url-metadata", "page-metadata", "preview-metadata", or "preview-block".
 * preview-metadata / preview-block are consumed but not shown or processed by Nest.
 */
function findBlockRoots(doc) {
  const selector = 'body div.text, body div.html, body div.block-html, body div.adobetv, body div.row-card, '
    + 'body div.url-metadata, body div.page-metadata, body div.preview-metadata, body div.preview-block';
  const candidates = doc.querySelectorAll(selector);
  const blockClasses = 'div.text, div.html, div.block-html, div.adobetv, div.row-card, div.url-metadata, '
    + 'div.page-metadata, div.preview-metadata, div.preview-block';
  return Array.from(candidates).filter(
    (div) => div.closest(blockClasses) === div,
  );
}

/**
 * Get content rows from a text block (same logic as Milo libs/blocks/text/text.js).
 * Rows = direct child divs. When multiple rows (or accent-bar), first row is background
 * (decorateBlockBg); we return only foreground rows so content parsing matches Milo.
 */
function getContentRows(blockEl) {
  const rows = [];
  for (let i = 0; i < blockEl.children.length; i++) {
    const row = blockEl.children[i];
    if (row?.tagName !== 'DIV') {
      continue;
    }
    rows.push(row);
  }
  if (rows.length > 1 || blockEl.matches?.('.accent-bar')) {
    return rows.slice(1); // first row = background, rest = foreground
  }
  return rows;
}

/** Parse h1–h6 tag name to level 1–6. */
function getHeadingLevel(tag) {
  const n = parseInt(tag.charAt(1), 10);
  return n >= 1 && n <= 6 ? n : 2;
}

/**
 * Convert an element's child nodes to inline ContentNodes (text, em, strong, a, span).
 * Used for content inside headings, detail, paragraphs. baseUrl resolves relative hrefs.
 */
function elementToInlineNodes(el, baseUrl = '') {
  const out = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i];
    if (node?.nodeType === Node.TEXT_NODE) {
      const value = node.textContent?.trim();
      if (value) {
        out.push({ type: 'text', value });
      }
      continue;
    }
    if (node?.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }
    const child = node;
    const tag = child.tagName.toLowerCase();
    if (tag === 'a') {
      const rawHref = child.href ?? child.getAttribute('href') ?? '';
      const resolved = baseUrl && rawHref && !/^[a-z][a-z0-9+.-]*:/i.test(rawHref)
        ? resolveUrl(rawHref, baseUrl)
        : rawHref;
      const { url: cleanUrl, contentId: parsedContentId } = extractHrefAndContentId(resolved);
      const className = getClassName(child);
      const { text: linkText, ariaLabel } = getTextAndAriaLabel(child);
      const attrs = { href: cleanUrl || resolved };
      if (ariaLabel) attrs.ariaLabel = ariaLabel;
      const contentId = child.getAttribute('data-content-id') || parsedContentId;
      if (contentId) attrs.contentId = contentId;
      let anchorChildren = elementToInlineNodes(child, baseUrl);
      if (ariaLabel && anchorChildren.length === 1 && anchorChildren[0].type === 'text') {
        anchorChildren = [{ type: 'text', value: linkText }];
      }
      out.push({
        type: 'element',
        tag: 'a',
        attrs,
        children: anchorChildren,
        ...(className && { className }),
      });
    } else if (tag === 'em' || tag === 'i') {
      const className = getClassName(child);
      out.push({
        type: 'element',
        tag: 'em',
        children: elementToInlineNodes(child, baseUrl),
        ...(className && { className }),
      });
    } else if (tag === 'strong' || tag === 'b') {
      const className = getClassName(child);
      out.push({
        type: 'element',
        tag: 'strong',
        children: elementToInlineNodes(child, baseUrl),
        ...(className && { className }),
      });
    } else if (tag === 'span') {
      const className = getClassName(child);
      out.push({
        type: 'element',
        tag: 'span',
        children: elementToInlineNodes(child, baseUrl),
        ...(className && { className }),
      });
    } else if (child.textContent?.trim()) {
      out.push({ type: 'text', value: child.textContent.trim() });
    }
  }
  return out;
}

/**
 * Convert a content div (one "row") to ContentNode[] in document order.
 * Same logic as Milo decorateBlockText (libs/utils/decorate.js): headings get heading size,
 * element before first heading (without picture) gets detail size, p/ul/ol/div get body size.
 * Sizes come from blockTypeSizes[blockType][size] + overrides (xl-heading, m-body, etc.).
 */
function contentDivToNodes(contentDiv, headingSize, bodySize, detailSize, titleSize, baseUrl = '') {
  const nodes = [];
  const childEls = Array.from(contentDiv.children);
  let firstHeadingIndex = -1;
  for (let i = 0; i < childEls.length; i++) {
    const tag = childEls[i]?.tagName?.toLowerCase();
    if (tag && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      firstHeadingIndex = i;
      break;
    }
  }

  if (firstHeadingIndex >= 0 && detailSize) {
    const prev = childEls[firstHeadingIndex - 1];
    if (prev && !prev.querySelector('picture') && hasText(prev)) {
      const className = getClassName(prev);
      nodes.push({
        type: 'detail',
        size: detailSize,
        children: elementToInlineNodes(prev, baseUrl),
        ...(className && { className }),
      });
    }
  }

  for (const el of childEls) {
    const tag = el?.tagName?.toLowerCase();
    if (!tag) {
      continue;
    }
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const level = getHeadingLevel(tag);
      const children = elementToInlineNodes(el, baseUrl);
      const className = getClassName(el);
      const elOverrides = getTextOverrides(el.classList);
      const useTitle = elOverrides.title ?? titleSize;
      const typographyVariant = useTitle ? 'title' : 'heading';
      const size = useTitle ?? headingSize;
      if (children.length > 0 || el.textContent?.trim()) {
        nodes.push({
          type: 'heading',
          level,
          size,
          typographyVariant,
          children:
            children.length > 0
              ? children
              : [{ type: 'text', value: el.textContent?.trim() ?? '' }],
          ...(className && { className }),
        });
      }
      continue;
    }
    if (tag === 'p' || tag === 'div') {
      const children = elementToInlineNodes(el, baseUrl);
      const className = getClassName(el);
      if (children.length > 0 || el.textContent?.trim()) {
        nodes.push({
          type: 'paragraph',
          size: bodySize,
          children:
            children.length > 0
              ? children
              : [{ type: 'text', value: el.textContent?.trim() ?? '' }],
          ...(className && { className }),
        });
      }
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = [];
      const listEl = el;
      for (let i = 0; i < listEl.children.length; i++) {
        const li = listEl.children[i];
        if (li?.tagName?.toLowerCase() === 'li') {
          items.push(elementToInlineNodes(li, baseUrl));
        }
      }
      const className = getClassName(el);
      if (items.length > 0) {
        nodes.push({
          type: 'list',
          ordered: tag === 'ol',
          size: bodySize,
          items,
          ...(className && { className }),
        });
      }
    }
  }

  if (nodes.length === 0 && hasText(contentDiv)) {
    const className = getClassName(contentDiv);
    nodes.push({
      type: 'paragraph',
      size: bodySize,
      children: elementToInlineNodes(contentDiv, baseUrl),
      ...(className && { className }),
    });
  }
  return nodes;
}

/**
 * Parse text block. Sizing from class overrides only (xl-heading, m-body, s-detail, etc.); default 'm' when absent.
 * Rendered with S2 Spectrum components and style() in ContentRenderer / TextBlock.
 */
function parseTextBlock(blockEl, baseUrl = '') {
  const { classList } = blockEl;
  const overrides = getTextOverrides(classList);
  const defaultSize = 'm';

  const headingSize = overrides.heading ?? defaultSize;
  const bodySize = overrides.body ?? defaultSize;
  const detailSize = overrides.detail ?? defaultSize;
  const titleSize = overrides.title;

  const blockClasses = Array.from(classList);

  const rows = [];
  const contentRows = getContentRows(blockEl);

  for (const row of contentRows) {
    const innerDivs = row.querySelectorAll(':scope > div');
    if (innerDivs.length === 0) {
      const nodeList = contentDivToNodes(
        row,
        headingSize,
        bodySize,
        detailSize,
        titleSize,
        baseUrl,
      );
      if (nodeList.length > 0) {
        rows.push(nodeList);
      }
      continue;
    }
    innerDivs.forEach((div) => {
      const nodeList = contentDivToNodes(
        div,
        headingSize,
        bodySize,
        detailSize,
        titleSize,
        baseUrl,
      );
      if (nodeList.length > 0) {
        rows.push(nodeList);
      }
    });
  }

  return {
    type: 'text',
    blockClasses,
    rows,
  };
}

/** Parse html block: same content tree as text so links get normalized href and linktext | aria-label. */
function parseHtmlBlock(blockEl, baseUrl = '') {
  const blockClasses = Array.from(blockEl.classList);
  const defaultSize = 'm';
  const rows = [];
  for (let i = 0; i < blockEl.children.length; i++) {
    const el = blockEl.children[i];
    if (!el || el.nodeType !== Node.ELEMENT_NODE) continue;
    const nodeList = blockElementToNodes(el, defaultSize, defaultSize, baseUrl);
    if (nodeList.length > 0) rows.push(nodeList);
  }
  return { type: 'html', blockClasses, rows };
}

function parseAdobeTvBlock(blockEl) {
  const a = blockEl.querySelector(
    'a[href*="video.tv.adobe.com"], a[href*=".mp4"]',
  );
  if (!a) {
    return null;
  }
  const href = a.href ?? '';
  const linkText = getTextContent(a);
  return {
    type: 'adobetv',
    blockClasses: Array.from(blockEl.classList),
    videoHref: href,
    linkText: linkText ?? '',
  };
}

/** True if string looks like an absolute URL (http(s) or //). */
function isUrlString(s) {
  const t = s.trim();
  return (
    t.startsWith('http://') || t.startsWith('https://') || t.startsWith('//')
  );
}

const ROW_CARD_CELLS = ['picture', 'title', 'description', 'link'];

/**
 * First row may be headers (picture, title, description, link); use the row that has actual content.
 * Same logic as blocks/row-card/row-card.js getContentRow.
 */
function getRowCardContentRow(blockEl) {
  const rows = Array.from(blockEl.children).filter((r) => r.children?.length >= ROW_CARD_CELLS.length);
  const headerLike = (cell) => {
    const t = (cell?.textContent || '').trim().toLowerCase();
    return ROW_CARD_CELLS.includes(t) || t === 'image';
  };
  const dataRow = rows.find((row) => {
    const first = row.children?.[0];
    return first && !headerLike(first) && (first.querySelector?.('span.icon, picture, img, a') || first.textContent?.trim());
  });
  return dataRow || rows[0] || blockEl.firstElementChild;
}

/**
 * Parse a row-card block: image (picture/img, or first div with URL text), title, description, optional CTA link.
 * Milo structure: .row-card > div(row) > div(cell), div(cell), div(cell), div(cell). First row may be header.
 */
function parseRowCardBlock(blockEl, baseUrl = '') {
  const wrapper = getRowCardContentRow(blockEl);
  if (!wrapper) {
    return null;
  }
  const children = Array.from(wrapper.children).filter((el) => el?.tagName === 'DIV');
  const pictureDiv = children[0];
  const titleDiv = children[1];
  const descriptionDiv = children[2];
  const ctaDiv = children[3];

  const img = pictureDiv?.querySelector('img');
  const picture = pictureDiv?.querySelector('picture');
  let src = (img?.getAttribute('src') ?? '')
    || (picture
      ?.querySelector('source')
      ?.getAttribute('srcset')
      ?.split(/\s+/)[0]
      ?? '');
  if (!src && pictureDiv) {
    const urlText = getTextContent(pictureDiv);
    if (urlText && isUrlString(urlText)) {
      src = urlText.trim();
    }
  }
  if (!src) {
    return null;
  }
  const resolvedSrc = baseUrl ? resolveUrl(src, baseUrl) : src;
  const srcSet = img?.getAttribute('srcset') ?? undefined;
  const alt = img?.getAttribute('alt') ?? undefined;

  const title = titleDiv ? getTextContent(titleDiv) : '';
  const description = descriptionDiv ? getTextContent(descriptionDiv) : '';
  let cta;
  const anchor = ctaDiv?.querySelector('a');
  if (anchor) {
    const href = anchor.href ?? anchor.getAttribute('href') ?? '';
    const { text = '', ariaLabel = '' } = getTextAndAriaLabel(anchor);
    const contentId = anchor.getAttribute('data-content-id') || undefined;
    const contentName = anchor.getAttribute('data-content-name') || undefined;
    if (href || text) {
      cta = {
        href:
          baseUrl && href && !/^[a-z][a-z0-9+.-]*:/i.test(href)
            ? resolveUrl(href, baseUrl)
            : href,
        text,
        ariaLabel: ariaLabel || text,
        contentId,
        contentName,
      };
    }
  }

  const image = {
    src: resolvedSrc,
    ...(srcSet !== undefined && srcSet !== '' && { srcSet }),
    ...(alt !== undefined && alt !== '' && { alt }),
  };
  const result = {
    type: 'rowcard',
    blockClasses: Array.from(blockEl.classList),
    image,
    title,
    description,
  };
  if (cta != null) {
    result.cta = cta;
  }
  return result;
}

/**
 * Process page-metadata block: key-value rows (e.g. style, analyticsParams).
 */
function processPageMetadataBlock(blockEl) {
  const rows = Array.from(blockEl.children).filter((el) => el?.tagName === 'DIV');
  const data = {};
  for (const row of rows) {
    const cells = Array.from(row.children).filter((el) => el?.tagName === 'DIV');
    const key = cells[0] ? getTextContent(cells[0]).trim().toLowerCase() : '';
    const rawValue = cells[1] ? getTextContent(cells[1]).trim() : '';
    if (key === 'style' && rawValue) {
      data.style = rawValue;
    } else if (key === 'analyticsparams' && rawValue) {
      data.analyticsParams = rawValue;
    }
  }
  boostContext.setPageMetadata(data);
}

/**
 * Serialize a list of DOM nodes to HTML (clones are used so the document is not mutated).
 */
function serializeNodesToHtml(doc, nodes) {
  if (nodes.length === 0) {
    return '';
  }
  const div = doc.createElement('div');
  nodes.forEach((n) => div.appendChild(n.cloneNode(true)));
  return div.innerHTML;
}

/**
 * Flush accumulated raw nodes into an HTML segment if non-empty.
 */
function flushRawRun(run, segments, doc) {
  if (run.length === 0) {
    return;
  }
  const html = serializeNodesToHtml(doc, run);
  if (html.trim()) {
    segments.push({ type: 'html', html });
  }
  run.length = 0;
}

/**
 * Traverse node in document order; emit raw HTML segments and block segments (blocks are not descended into).
 */
function processNode(node, blockRoots, run, segments, doc, baseUrl) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node;
    if (blockRoots.has(el)) {
      flushRawRun(run, segments, doc);
      if (el.classList.contains('text')) {
        segments.push({ type: 'block', block: parseTextBlock(el, baseUrl) });
      } else if (el.classList.contains('html') || el.classList.contains('block-html')) {
        const htmlBlock = parseHtmlBlock(el, baseUrl);
        if (htmlBlock.rows.length > 0) {
          segments.push({ type: 'block', block: htmlBlock });
        }
      } else if (el.classList.contains('adobetv')) {
        const adobe = parseAdobeTvBlock(el);
        if (adobe) {
          segments.push({ type: 'block', block: adobe });
        }
      } else if (el.classList.contains('row-card')) {
        const rowCard = parseRowCardBlock(el, baseUrl);
        if (rowCard) {
          segments.push({ type: 'block', block: rowCard });
        }
      } else if (el.classList.contains('page-metadata')) {
        processPageMetadataBlock(el);
      } else if (el.classList.contains('preview-metadata')) {
        // Not shown or processed by Nest (used only by da-xe-surfaces redirect).
      }
      return;
    }
    const hasBlockDescendant = Array.from(blockRoots).some(
      (b) => el !== b && el.contains(b),
    );
    if (hasBlockDescendant) {
      for (let i = 0; i < el.childNodes.length; i++) {
        const child = el.childNodes[i];
        if (child) {
          processNode(child, blockRoots, run, segments, doc, baseUrl);
        }
      }
      return;
    }
  }
  run.push(node);
}

/**
 * Parse document into segments in document order: raw HTML (content not inside a block) and blocks (text, adobetv, row-card).
 * Url-metadata and page-metadata are processed for context but not emitted as segments.
 * preview-metadata and preview-block are not shown or processed.
 */
export function parseDocumentToSegments(doc, baseUrl = '') {
  boostContext.setPageMetadata({});

  const roots = findBlockRoots(doc);
  const blockRoots = new Set(roots);
  const segments = [];
  const run = [];

  const { body } = doc;
  if (!body) {
    return segments;
  }
  for (let i = 0; i < body.childNodes.length; i++) {
    const child = body.childNodes[i];
    if (child) {
      processNode(child, blockRoots, run, segments, doc, baseUrl);
    }
  }
  flushRawRun(run, segments, doc);
  return segments;
}

/**
 * Parse document into list of text, adobetv, and row-card blocks (Milo authoring).
 * baseUrl is used to resolve relative image and link URLs in row-card blocks.
 */
export function parseDocumentToBlocks(doc, baseUrl = '') {
  const segments = parseDocumentToSegments(doc, baseUrl);
  return segments
    .filter((s) => s.type === 'block')
    .map((s) => s.block);
}

/**
 * Parse HTML string to segments. Use when init.js fetches via customFetch and has HTML string.
 */
export function parseHtmlToSegments(html, baseUrl = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseDocumentToSegments(doc, baseUrl);
}

/**
 * Convert a single block element (div, p, h1–h6, ul, ol) to ContentNode[].
 */
blockElementToNodes = function (el, headingSize, bodySize, baseUrl) {
  const tag = el.tagName?.toLowerCase();
  if (tag === 'div') {
    return contentDivToNodes(el, headingSize, bodySize, undefined, undefined, baseUrl);
  }
  if (tag && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    const children = elementToInlineNodes(el, baseUrl);
    const className = getClassName(el);
    const elOverrides = getTextOverrides(el.classList);
    const useTitle = elOverrides.title;
    const typographyVariant = useTitle ? 'title' : 'heading';
    const size = useTitle ?? headingSize;
    return [
      {
        type: 'heading',
        level: getHeadingLevel(tag),
        size,
        typographyVariant,
        children:
          children.length > 0
            ? children
            : [{ type: 'text', value: el.textContent?.trim() ?? '' }],
        ...(className && { className }),
      },
    ];
  }
  if (tag === 'p') {
    const children = elementToInlineNodes(el, baseUrl);
    const className = getClassName(el);
    return [
      {
        type: 'paragraph',
        size: bodySize,
        children:
          children.length > 0
            ? children
            : [{ type: 'text', value: el.textContent?.trim() ?? '' }],
        ...(className && { className }),
      },
    ];
  }
  if (tag === 'ul' || tag === 'ol') {
    const items = [];
    for (let i = 0; i < el.children.length; i++) {
      const li = el.children[i];
      if (li?.tagName?.toLowerCase() === 'li') {
        items.push(elementToInlineNodes(li, baseUrl));
      }
    }
    const className = getClassName(el);
    if (items.length > 0) {
      return [
        {
          type: 'list',
          ordered: tag === 'ol',
          size: bodySize,
          items,
          ...(className && { className }),
        },
      ];
    }
  }
  // Generic element (section, table, img, etc.): preserve tag + safe attrs + children
  return [
    {
      type: 'host',
      tag,
      attrs: getSafeAttrs(el, baseUrl),
      children: domToContentNodes(el, baseUrl, headingSize, bodySize),
    },
  ];
};

/**
 * Parse an HTML string into ContentNode[] (Milo-style tree) for safe rendering without dangerouslySetInnerHTML.
 * Uses default body/heading size 'm'. baseUrl resolves relative links.
 */
export function parseHtmlToContentNodes(html, baseUrl = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const { body } = doc;
  if (!body) {
    return [];
  }
  const out = [];
  const defaultSize = 'm';
  for (let i = 0; i < body.children.length; i++) {
    const el = body.children[i];
    if (!el || el.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }
    out.push(...blockElementToNodes(el, defaultSize, defaultSize, baseUrl));
  }
  return out;
}

/**
 * Fetch URL and return parsed segments (raw HTML + blocks) in document order.
 * Relative URLs in row-card images/links are resolved against the fetched url.
 */
export async function fetchAndParseBlocks(url) {
  const doc = await fetchPlainHtml(url);
  return parseDocumentToSegments(doc, url);
}
