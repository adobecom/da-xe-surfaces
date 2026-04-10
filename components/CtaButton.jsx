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
 * Wraps React Spectrum Button and emits CTA click events (analytics + navigation)
 * in the same format as setupCtaClickHandler. Use for any block CTA that should
 * trigger boost-event.
 */
import { useCallback } from 'react';
import { Button } from '@react-spectrum/s2';
import boostContext from '../context/boost-context.js';
import { emitCtaClick } from '../utils/utils.js';

export default function CtaButton({
    href,
    contentId,
    children,
    ...buttonProps
}) {
    const onPress = useCallback(() => {
        const { container } = boostContext;
        if (!container || !href) return;
        emitCtaClick(container, href);
    }, [href, contentId]);

    if (!href || href === '#') return null;

    return (
        <Button onPress={onPress} {...buttonProps}>
            {children}
        </Button>
    );
}
