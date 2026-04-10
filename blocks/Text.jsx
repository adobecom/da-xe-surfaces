/** ******************************************************************
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 ****************************************************************** */

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
