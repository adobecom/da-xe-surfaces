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

/**
 * Renders content tree (from parse-plain-html) using styles.css typography classes.
 * Link clicks emit boost-event via boost-context.
 */
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };

function getHeadingClassName(size) {
    switch (size) {
        case 'xs':
            return style({ font: 'heading-xs' });
        case 'sm':
            return style({ font: 'heading-sm' });
        case 'lg':
            return style({ font: 'heading-lg' });
        case 'xl':
            return style({ font: 'heading-xl' });
        default:
            return style({ font: 'heading' });
    }
}

function getBodyClassName(size) {
    switch (size) {
        case 'xs':
            return style({ font: 'body-xs' });
        case 'sm':
            return style({ font: 'body-sm' });
        case 'lg':
            return style({ font: 'body-lg' });
        case 'xl':
            return style({ font: 'body-xl' });
        default:
            return style({ font: 'body' });
    }
}

function getDetailClassName(size) {
    switch (size) {
        case 'sm':
            return style({ font: 'detail-sm' });
        case 'md':
            return style({ font: 'detail' });
        case 'lg':
            return style({ font: 'detail-lg' });
        case 'xl':
            return style({ font: 'detail-xl' });
        default:
            return style({ font: 'detail' });
    }
}

function getTitleClassName(size) {
    switch (size) {
        case 'xs':
            return style({ font: 'title-xs' });
        case 'sm':
            return style({ font: 'title-sm' });
        case 'lg':
            return style({ font: 'title-lg' });
        case 'xl':
            return style({ font: 'title-xl' });
        default:
            return style({ font: 'title' });
    }
}

function renderContent(
    node,
    key,
    inline,
) {
    const wrapWithClassDiv = (content, className) => (
        <div key={key} className={className}>
            {content}
        </div>
    );

    switch (node.type) {
        case 'text':
            return node.value;
        case 'element': {
            const { tag, attrs = {}, children, className } = node;
            const childNodes = inline(children);
            if (className) {
                return wrapWithClassDiv(childNodes, className);
            }
            if (tag === 'a') {
                const href = attrs?.href ?? '#';
                const ariaLabel = attrs?.ariaLabel;
                const contentId = attrs?.contentId;
                return (
                    <a
                        key={key}
                        href={href}
                        {...(ariaLabel && { 'aria-label': ariaLabel })}
                        {...(contentId && { 'data-content-id': contentId })}
                    >
                        {childNodes}
                    </a>
                );
            }
            if (tag === 'em') {
                return <em key={key}>{childNodes}</em>;
            }
            if (tag === 'strong') {
                return <strong key={key}>{childNodes}</strong>;
            }
            return <span key={key}>{childNodes}</span>;
        }
        case 'heading': {
            const content = inline(node.children);
            const headingClass = node.typographyVariant === 'title'
                ? getTitleClassName(node.size)
                : getHeadingClassName(node.size);
            const Tag = `h${node.level ?? 2}`;
            return <Tag key={key} className={headingClass}>{content}</Tag>;
        }
        case 'detail': {
            const content = inline(node.children);
            return wrapWithClassDiv(content, getDetailClassName(node.size));
        }
        case 'paragraph': {
            const content = inline(node.children);
            return wrapWithClassDiv(content, getBodyClassName(node.size));
        }
        case 'title': {
            const content = inline(node.children);
            return wrapWithClassDiv(content, getTitleClassName(node.size));
        }
        case 'list': {
            const listContent = (
                <>
                    {node.items.map((itemNodes, i) => (
                        <li key={i}>{inline(itemNodes)}</li>
                    ))}
                </>
            );
            if (node.className) {
                return node.ordered ? (
                    <div key={key} className={node.className}>
                        <ol className={getBodyClassName(node.size)}>{listContent}</ol>
                    </div>
                ) : (
                    <div key={key} className={node.className}>
                        <ul className={getBodyClassName(node.size)}>{listContent}</ul>
                    </div>
                );
            }
            return node.ordered ? (
                <ol key={key} className={getBodyClassName(node.size)}>
                    {node.items.map((itemNodes, i) => (
                        <li key={i}>{inline(itemNodes)}</li>
                    ))}
                </ol>
            ) : (
                <ul key={key} className={getBodyClassName(node.size)}>
                    {node.items.map((itemNodes, i) => (
                        <li key={i}>{inline(itemNodes)}</li>
                    ))}
                </ul>
            );
        }
        default:
            return null;
    }
}

/**
 * Renders content tree (from Milo-parsing logic) using S2 Spectrum components and CSS.
 * Typography via @react-spectrum/s2 style(); semantic HTML (h1–h6, p, em, strong, a, ul, ol)
 * with S2 theme variables. No dangerouslySetInnerHTML.
 */
export default function ContentRenderer({ nodes }) {
    const inline = (nodeList) => nodeList.map((n, i) => renderContent(n, i, inline));

    if (nodes.length === 0) {
        return <></>;
    }
    return <>{nodes.map((node, i) => renderContent(node, i, inline))}</>;
}
