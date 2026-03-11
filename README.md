# da-xe-surfaces

Website foundation technology for DA (Digital Assistant) surfaces. Provides the `<xe-sites>` web component and block system for rendering Milo-style content in Spectrum-themed layouts. Used by both **head.html** (Milo/AEM full-page) and **Nest** (e.g. Boost applet).

## Project structure

```
da-xe-surfaces/
├── bundle-entry.js          # Webpack entry: define-patch → init → scripts
├── define-patch.js          # Patches customElements.define to skip duplicate registrations
├── init.js                  # XeSites LitElement, block registry, fragment loading
├── head.html                # Milo/AEM: sets BUILD_MODE=dynamic, loads bundle
├── 404.html                 # 404 page template
├── blocks/                  # Block decorators (Milo-compatible authoring)
│   ├── page-metadata/       # Page-level: class, style, analyticsParams
│   ├── row-card/            # Row layout: icon, title, description, CTA
│   ├── text/                # Typography: heading/body presets, alignment
│   └── adobetv/             # Adobe TV iframe or native video
├── utils/
│   ├── utils.js             # loadArea, customFetch, createTag, resolveIcon, etc.
│   └── decorate.js          # decorateButton, decorateBlockText, getButtonProps
├── scripts/
│   ├── scripts.js           # Full-page logic (dynamic mode): wrapPageInSpTheme, loadEager
│   ├── accessibility.js    # Tab focus scroll, dialog aria attributes
│   ├── generate-xe-components.js  # Prebuild: generates xe-*.js from package.json
│   └── xe-replace-loader.js # Webpack: replaces sp-* with xe-* in blocks/utils/styles/scripts
├── styles/
│   └── styles.css           # Base styles, typography presets, block spacing
├── xe-components.js         # Generated: imports all xe-*.js wrappers
├── xe-theme.js, xe-button.js  # Generated: xe-* wrappers (isolated from host sp-*)
├── xe-components.config.cjs # Optional: override auto-detected SWC mappings
├── webpack.config.cjs       # Build config: swc-loader, xe-replace-loader, postcss
├── postcss.config.cjs       # postcss-prefixwrap: scopes CSS to .xe-sites
└── package.json
```

## Architecture

### xe-sites

LitElement web component that:

1. Fetches a fragment (`.plain.html`) via `customFetch` (with retry for 425/503)
2. Parses HTML, creates `<main>`, wraps it in `<xe-theme>`
3. Runs `loadArea(main)` to decorate blocks from `window.xeBlockRegistry`
4. Dispatches `xe-sites-event` for loading state, analytics, link handling

Uses **xe-theme** and **xe-button** (not `sp-*`) so it stays isolated from Nest's React Spectrum / SWC.

### Two modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Dynamic** (head.html) | `BUILD_MODE === 'dynamic'` in head | `scripts.js` wraps the page in `xe-theme`, runs `loadArea(main)`, decorates blocks. Theme from URL: `?theme=dark` or `#theme=dark`. |
| **Builtin** (Nest) | `BUILD_MODE === 'builtin'` (default) | Host renders `<xe-sites path="..." theme="dark">`. Component loads fragment and decorates blocks. Theme from `theme` prop. |

### head.html

`head.html` sets `BUILD_MODE = "dynamic"` and loads:

```html
<link rel="stylesheet" href="/styles/styles.css"/>
<script type="module" src="/dist/da-xe-surfaces.js"></script>
```

The bundle includes xe-components (xe-theme, xe-button), block logic, and full-page scripts. No import map or separate SWC scripts are needed.

### xe-components (sp-* → xe-*)

To avoid conflicts when xe-sites is embedded in Nest (which uses React Spectrum / SWC):

1. **Prebuild** generates `xe-theme.js`, `xe-button.js`, etc. from `@spectrum-web-components/*` in `package.json`.
2. **xe-replace-loader** replaces `sp-theme` → `xe-theme`, `sp-button` → `xe-button` in blocks, utils, styles, scripts at build time.
3. Devs write standard SWC names (`sp-theme`, `sp-button`); the build produces isolated `xe-*` elements.

Components are **auto-detected** from `package.json` dependencies. Optional config: `xe-components.config.cjs`.

### Block registry

`window.xeBlockRegistry` maps block names to decorator functions. Blocks transform table-based markup into final UI. Blocks are loaded from `loadBlock` (checks registry first, then dynamic import).

| Block | Purpose |
|-------|---------|
| `page-metadata` | Page-level: `class`/`classes` → body, `style` → spacing, `analyticsParams` → data-content-name/id |
| `row-card` | Row layout: picture, title, description, CTA button. Supports icon, blob URLs for media. |
| `text` | Typography: heading/body presets (xl-heading, m-body, etc.), alignment (center, left, right). |
| `adobetv` | Adobe TV embed: `video.tv.adobe.com` → iframe, `.mp4` → native video. |

### Utils

- **loadArea** — Finds sections, decorates blocks, runs `loadBlock` for each.
- **customFetch** — Fetch with retry, cache rules, cross-origin proxy support.
- **createTag** — Creates elements with attributes.
- **decorateButton** — Renders `sp-button` (→ xe-button) with variant, size, href.
- **resolveIcon** — Resolves icon from name (e.g. `span.icon` or URL).
- **setupLinkClickHandler** — Handles link clicks, emits `xe-sites-event` for host delegation.

## Developing

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Build the bundle:**
   ```sh
   npm run build
   ```
   Produces `dist/da-xe-surfaces.js`. `prebuild` runs automatically first (generates xe-components from `package.json`). To override mappings, create `xe-components.config.cjs` (see [xe-components config](#xe-components-config)).

3. **Start the local server:**
   ```sh
   aem up
   ```
   Requires the [Helix CLI](https://github.com/adobe/helix-cli): `sudo npm install -g @adobe/aem-cli`. Opens browser at `http://localhost:3000`.

After making changes, run `npm run build` again to rebuild.

**When package.json or xe-components.config.cjs changes** (e.g. adding `@spectrum-web-components/*`), any dev pulling the update must run `npm install` and `npm run build` to regenerate xe-components.

## Building

```sh
npm run build
```

Produces `dist/da-xe-surfaces.js` (and source map). Entry: `bundle-entry.js` → `define-patch.js` → `init.js` → `scripts/scripts.js`.

### xe-components config

xe-components are **auto-detected** from `package.json`: any `@spectrum-web-components/*` dependency becomes an `xe-*` wrapper (e.g. `@spectrum-web-components/button` → `xe-button`). No config file needed.

To override or customize, create `xe-components.config.cjs`:

```js
module.exports = {
  'sp-theme': { package: '@spectrum-web-components/theme', export: 'Theme' },
  'sp-button': { package: '@spectrum-web-components/button', export: 'Button' },
};
```

Set `autoDetect: true` to ignore manual entries and use package.json only.

## Testing

```sh
npm run test
```

or:

```sh
npm run test:watch
```

## Using xe-sites in another repo (e.g. Nest)

The `<xe-sites>` web component loads and renders a fragment (`.plain.html`) inside a Spectrum-themed container.

### Script URL (recommended for Nest)

Load the bundle dynamically:

```js
import(/* webpackIgnore: true */ 'https://your-cdn/da-xe-surfaces.js').then(() => {
  // xe-sites is now defined
});
```

Then render:

```html
<xe-sites path="/path/to/fragment.plain.html" theme="dark"></xe-sites>
```

### npm dependency (when using a bundler)

```bash
npm install @adobecom/da-xe-surfaces
# Or from Git:
npm install git+https://github.com/adobecom/da-xe-surfaces.git
```

**Peer dependencies** (versions aligned with Nest):

```bash
npm install lit@^2.7.3 @spectrum-web-components/theme@0.47.2 @spectrum-web-components/button@0.47.2
```

**In your app:**

```js
import '@adobecom/da-xe-surfaces';
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `path` | string | Fragment URL (relative or absolute) |
| `theme` | `'light' \| 'dark'` | Overrides URL theme when set (e.g. from Boost) |
| `scale` | `'medium' \| 'large'` | xe-theme scale. Default `medium`. |
| `themeSystem` | `'spectrum' \| 'spectrum-two'` | Default `spectrum-two`. |
| `environment` | `'stage' \| 'prod'` | For URL resolution. |
| `host` | `'cch' \| 'ccd'` | Host app type. |

Package `main` is `init.js`. The consuming app's bundler must resolve Lit, Spectrum components, and CSS.

### Cross-origin fragment proxy

When the fragment URL is on another origin, set a proxy before loading the script:

```js
window.xeSitesFragmentProxy = 'https://your-backend-proxy/?url=';
// Or a function:
window.xeSitesFragmentProxy = (url) => 'https://your-proxy/?url=' + encodeURIComponent(url);
```

### Events

Listen for `xe-sites-event`:

```js
element.addEventListener('xe-sites-event', (e) => {
  const { type, subType, data } = e.detail;
  // type: 'system' | 'link' | ...
  // subType: 'loaded' | 'error' | 'loading' | ...
});
```

## Typography

Uses Spectrum tokens with Milo-aligned sizes. Heading/body presets: `.heading-xxxl` … `.heading-xxs`, `.body-xxl` … `.body-xxs`. See `styles/styles.css`.

Block spacing: `.blockspacingtop-*` / `.blockspacingbottom-*` (xxxs | xxs | xs | s | m | l | xl | xxl | xxxl | 4xl | 5xl).

## Linting

```sh
npm run lint        # ESLint + Stylelint
npm run lint:js     # ESLint only
npm run lint:css    # Stylelint only
```

## Security

1. Create a Service Now ID for your project via [Service Registry Portal](https://adobe.service-now.com/service_registry_portal.do#/search)
2. Update `.kodiak/config.yaml` so valid team members are assigned security vulnerability Jira tickets.
