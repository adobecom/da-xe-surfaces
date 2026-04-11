/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

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
