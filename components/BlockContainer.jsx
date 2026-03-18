/**
 * Wraps React blocks with Provider (theme) and renders segment by segment.
 */
import { Provider } from '@react-spectrum/s2';
import ReactDOM from 'react-dom/client';
import boostContext from '../context/boostContext.js';
import { parseHtmlToContentNodes } from '../utils/parsePlainHtml.js';
import ContentRenderer from './ContentRenderer.jsx';
import TextBlock from '../blocks/Text.jsx';
import RowCardBlock from '../blocks/RowCard.jsx';
import AdobeTvBlock from '../blocks/AdobeTv.jsx';

function getBlockClassName(type, blockClasses = []) {
  const base = type ? `block block-${type}` : 'block';
  const extra = (blockClasses || []).filter((c) => c && c !== type).join(' ');
  return extra ? `${base} ${extra}` : base;
}

function BlockForSegment({ segment }) {
  if (segment.type === 'html') {
    const baseUrl = boostContext.baseUrl || '';
    const nodes = parseHtmlToContentNodes(segment.html, baseUrl);
    if (!ContentRenderer) return null;
    return (
      <div className={getBlockClassName('html')}>
        <ContentRenderer nodes={nodes} />
      </div>
    );
  }
  const { block } = segment;
  if (!block) return null;
  const blockType = block.type;
  const blockClasses = block.blockClasses ?? [];
  let content = null;
  if (blockType === 'text' || blockType === 'html') {
    content = TextBlock ? <TextBlock block={block} /> : null;
  } else if (blockType === 'rowcard') {
    content = RowCardBlock ? <RowCardBlock block={block} /> : null;
  } else if (blockType === 'adobetv') {
    content = AdobeTvBlock ? <AdobeTvBlock block={block} /> : null;
  }
  if (content) {
    return (
      <div className={getBlockClassName(blockType, blockClasses)}>
        {content}
      </div>
    );
  }
  return null;
}

export default function renderSegmentsToContainer(container, segments, theme) {
  if (!container || !segments?.length) return;
  const colorScheme = theme === 'dark' ? 'dark' : 'light';
  const root = ReactDOM.createRoot(container);
  root.render(
  <Provider colorScheme={colorScheme}>
    <div className="boost-blocks" data-color-scheme={colorScheme}>
      {segments.map((seg, i) => (
        <BlockForSegment key={i} segment={seg} theme={colorScheme} />
      ))}
    </div>
  </Provider>,
  );
}
