/**
 * Wraps React blocks with Provider (theme) and renders segment by segment.
 */
import { Provider } from '@react-spectrum/s2';
import ReactDOM from 'react-dom/client';
import xeSitesContext from '../context/xeSitesContext.js';
import { parseHtmlToContentNodes } from '../util/parsePlainHtml.js';
import ContentRenderer from './ContentRenderer.jsx';
import TextBlock from './TextBlock.jsx';
import RowCardBlock from './RowCardBlock.jsx';
import AdobeTvBlock from './AdobeTvBlock.jsx';

function getBlockClassName(type, blockClasses = []) {
  const base = type ? `block block-${type}` : 'block';
  const extra = (blockClasses || []).filter((c) => c && c !== type).join(' ');
  return extra ? `${base} ${extra}` : base;
}

function BlockForSegment({ segment }) {
  if (segment.type === 'html') {
    const baseUrl = xeSitesContext.baseUrl || '';
    const nodes = parseHtmlToContentNodes(segment.html, baseUrl);
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
    content = <TextBlock block={block} />;
  } else if (blockType === 'rowcard') {
    content = <RowCardBlock block={block} />;
  } else if (blockType === 'adobetv') {
    content = <AdobeTvBlock block={block} />;
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
    <div className="xe-sites-blocks" data-color-scheme={colorScheme}>
      {segments.map((seg, i) => (
        <BlockForSegment key={i} segment={seg} theme={colorScheme} />
      ))}
    </div>
  </Provider>,
  );
}
