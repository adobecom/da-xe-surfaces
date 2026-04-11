/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import ContentRenderer from '../components/ContentRenderer.jsx';

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
