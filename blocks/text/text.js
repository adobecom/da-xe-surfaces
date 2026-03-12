import { FONT_PRESET_KEYS } from '../../utils/decorate.js';

const HEADING_SIZES = ['xl', 'lg', 'm', 'sm', 'xs'];
const BODY_SIZES = ['xl', 'lg', 'm', 'sm', 'xs'];
const ALIGNMENTS = ['center', 'left', 'right', 'justify'];
const TITLE_SIZES = ['xl', 'lg', 'm', 'sm', 'xs'];

function getHeadingPreset(block) {
  const classes = [...(block.classList || [])];
  const headingSize = HEADING_SIZES.find((s) => classes.includes(`${s}-heading`));
  if (headingSize) {
    return `heading-${headingSize}`;
  }
  const titleSize = TITLE_SIZES.find((s) => classes.includes(`${s}-title`));
  if (titleSize) {
    return `title-${titleSize}`;
  }
  return null;
}

function getBodyPreset(block) {
  const classes = [...(block.classList || [])];
  const size = BODY_SIZES.find((s) => classes.includes(`${s}-body`));
  return size ? `body-${size}` : null;
}

function getAlignment(block) {
  const classes = [...(block.classList || [])];
  const align = ALIGNMENTS.find((a) => classes.includes(`${a}-alignment`) || classes.includes(a));
  return align || null;
}

export default async function init(el) {
  if (!el?.classList) return;

  const headingPreset = getHeadingPreset(el);
  el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    heading.classList.add(headingPreset && FONT_PRESET_KEYS.has(headingPreset) ? headingPreset : 'heading-l');
  });

  const bodyPreset = getBodyPreset(el);
  el.querySelectorAll('p').forEach((p) => {
    p.classList.add(bodyPreset && FONT_PRESET_KEYS.has(bodyPreset) ? bodyPreset : 'body-m');
  });

  const alignment = getAlignment(el);
  if (alignment) {
    el.classList.add(`text-align-${alignment}`);
  }
}
