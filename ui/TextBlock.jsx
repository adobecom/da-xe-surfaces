import ContentRenderer from './ContentRenderer.jsx';

/**
 * Text block: renders rows of content using ContentRenderer.
 * Uses styles.css typography classes.
 */

export default function TextBlock({ block }) {
  const isCenter = block?.blockClasses?.some((c) => c === 'center') ?? false;
  const align = isCenter ? 'center' : 'flex-start';
  const textAlign = isCenter ? 'center' : 'start';
  const blockClasses = block?.blockClasses ?? [];
  const extraClasses = blockClasses.filter((c) => c && c !== 'text' && c !== 'html').join(' ');

  return (
    <div
      className={`text${extraClasses ? ` ${extraClasses}` : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        textAlign,
      }}
    >
      {(block?.rows || []).map((rowNodes, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: align,
            gap: 16,
          }}
        >
          <ContentRenderer nodes={rowNodes} />
        </div>
      ))}
    </div>
  );
}
