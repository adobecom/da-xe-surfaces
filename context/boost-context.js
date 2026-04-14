/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Lightweight context for boost blocks (standalone or embedded in Nest).
 * When embedded, host listens for boost-event and delegates; blocks call
 * onLinkClick/onButtonClick. Event contract (must match Nest): boost-event
 * detail shapes for loaded, error, loading, analytics, navigation.
 * See docs/REACT_BLOCKS_MIGRATION.md.
 */
const BOOST_EVENT = 'boost-event';

const boostContext = {
    theme: 'light',
    env: '',
    stageDomainsMap: {},
    baseUrl: '',
    pageMetadata: {},
    analyticsParams: {}, // page-metadata: name, id, subcategory, subtype
    onLinkClick: null,
    onButtonClick: null,
    /** Set by boost: (container, detail) => dispatch CustomEvent. */
    dispatchEvent: null,
    /** Fragment container for event dispatch. Set by boost before rendering. */
    container: null,

    setTheme(theme) {
        this.theme = theme;
    },

    setBaseUrl(url) {
        this.baseUrl = url;
    },

    setPageMetadata(meta) {
        this.pageMetadata = meta || {};
        this.analyticsParams = {};
        const raw = meta?.analyticsParams;
        if (raw && typeof raw === 'string') {
            raw.split('|').forEach((param) => {
                const [key, value] = param.split(':');
                if (key && value) {
                    this.analyticsParams[key.trim()] = value.trim();
                }
            });
        }
    },

    /** contentId for loaded event (from analyticsParams id). */
    getContentId() {
        return this.analyticsParams.id || '';
    },

    /** contentName for loaded event (from analyticsParams name). */
    getContentName() {
        return this.analyticsParams.name || '';
    },

    setDispatchEvent(fn) {
        this.dispatchEvent = fn;
    },

    setContainer(el) {
        this.container = el;
    },

    /** Emit boost-event. Blocks call for link/button clicks. Uses this.container if no arg. */
    emit(container, detail) {
        const target = container ?? this.container;
        if (this.dispatchEvent && target) {
            this.dispatchEvent(target, detail);
        }
    },

    setEnv(env) {
        this.env = env;
    },

    setStageDomainsMap(stageDomainsMap) {
        this.stageDomainsMap = stageDomainsMap;
    },
};

export default boostContext;
export { BOOST_EVENT };
