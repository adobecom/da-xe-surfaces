/**
 * Lightweight context for xe-sites blocks (standalone or embedded in Nest).
 * When embedded, host listens for xe-sites-event and delegates; blocks call
 * onLinkClick/onButtonClick. Event contract (must match Nest): xe-sites-event
 * detail shapes for loaded, error, loading, analytics, navigation.
 * See docs/REACT_BLOCKS_MIGRATION.md.
 */
const XE_SITES_EVENT = 'xe-sites-event';

const xeSitesContext = {
  theme: 'light',
  baseUrl: '',
  pageMetadata: {},
  analyticsParams: {}, // page-metadata: name, id, subcategory, subtype
  onLinkClick: null,
  onButtonClick: null,
  /** Set by xe-sites: (container, detail) => dispatch CustomEvent. */
  dispatchEvent: null,
  /** Fragment container for event dispatch. Set by xe-sites before rendering. */
  container: null,

  setTheme(theme) {
    this.theme = theme;
    const scheme = (theme && theme.trim()) || 'light';
    document.documentElement.setAttribute('data-color-scheme', scheme);
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

  /** Emit xe-sites-event. Blocks call for link/button clicks. Uses this.container if no arg. */
  emit(container, detail) {
    const target = container ?? this.container;
    if (this.dispatchEvent && target) {
      this.dispatchEvent(target, detail);
    }
  },

  setOnLinkClick(fn) {
    this.onLinkClick = fn;
  },

  setOnButtonClick(fn) {
    this.onButtonClick = fn;
  },
};

export default xeSitesContext;
export { XE_SITES_EVENT };
