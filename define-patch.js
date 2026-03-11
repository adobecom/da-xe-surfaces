/**
 * Patch customElements.define to skip duplicate registrations.
 * Must run before init.js so any remaining SWC imports use this.
 * xe-theme and xe-button are xe-sites-specific and never conflict with host.
 */
const define = customElements.define.bind(customElements);
customElements.define = function (name, clazz, options) {
  if (customElements.get(name)) return;
  define(name, clazz, options);
};
