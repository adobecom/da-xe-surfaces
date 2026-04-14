/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Wraps React blocks with Provider (theme) and renders segment by segment.
 */
import { Provider } from '@react-spectrum/s2';
import ReactDOM from 'react-dom/client';
import boostContext from '../context/boost-context.js';
import { parseHtmlToContentNodes } from '../utils/parse-plain-html.js';
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
            <div className="boost-blocks" data-color-scheme={colorScheme}>
                {segments.map((seg, i) => (
                    <BlockForSegment key={i} segment={seg} theme={colorScheme} />
                ))}
            </div>
        </Provider>,
    );
}
