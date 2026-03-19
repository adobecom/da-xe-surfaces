# da-xe-surfaces (`@adobecom/da-xe-surfaces`)

Website foundation for rendering **Milo-style** content blocks from **plain HTML** (Franklin/AEM-style). One webpack build produces **`dist/da-xe-surfaces.js`**, used in:

- **Full-page mode** — `head.html` + `BUILD_MODE = 'dynamic'`: resolves the current path to a `.plain.html` URL, fetches it, and renders into `main` / `body`.
- **Embedded mode** — Any application loads the bundle once, then mounts the **`<boost-content>`** custom element with a **`path`** (fragment URL) and **`theme`**; the element fetches that URL as plain HTML and renders inside the light DOM. The app listens for **`boost-event`** for loading state, navigation, analytics, and errors.

Blocks are implemented in **React** with **Spectrum 2 (S2)**. CSS is wrapped with **PostCSS** (`postcss-prefixwrap`) under **`.boost-blocks`** so styles apply in both modes.

---

## Quick start

```bash
npm install
npm run build
```

Output: **`dist/da-xe-surfaces.js`** (+ source map). Registering the script defines **`<boost-content>`** globally and runs full-page logic when `window.app.BUILD_MODE === 'dynamic'`.

**Consumers** that install this package via npm/git need **`dist/da-xe-surfaces.js` present** in the published tree (commit `dist/` or run `npm run build` after install).

---

## Package metadata

| | |
|--|--|
| **Name** | `@adobecom/da-xe-surfaces` |
| **Module** | ESM (`"type": "module"`); webpack bundles for browser |
| **Main (source)** | `init.js` (Lit element + entry side effects) |
| **Bundle entry** | `bundle-entry.js` → `init.js` + `scripts/scripts.js` |

---

## Running with head.html (full-page)

1. **`npm run build`**
2. Serve the repo so **`/dist/da-xe-surfaces.js`** and **`*.plain.html`** resolve (e.g. `npx serve . -p 3000`, or Milo/AEM / `aem up`).
3. Open **`head.html`** (or a page that sets `window.app.BUILD_MODE = 'dynamic'` and loads the bundle). The script maps pathname → `.plain.html` (e.g. `/` → `/index.plain.html`).
4. **Theme:** query or hash `?theme=dark` / `#theme=dark` (default `light`).

---

## Embedding in any application

Load **`dist/da-xe-surfaces.js`** once (script tag, bundler, or dynamic import). Examples:

```html
<script type="module" src="/path/to/da-xe-surfaces.js"></script>
```

```js
// ESM / bundler (if the package is installed)
import('@adobecom/da-xe-surfaces/dist/da-xe-surfaces.js');

// Or a deployed URL (e.g. webpackIgnore so the bundler does not rewrite it)
import(/* webpackIgnore: true */ 'https://your.cdn.example/da-xe-surfaces.js');
```

After the bundle executes, **`<boost-content>`** is registered as a global custom element.

### Mount `<boost-content>`

After the bundle runs, create the element and set properties **before** appending:

```javascript
const el = document.createElement('boost-content');
el.path = fragmentUrl; // full URL or path to .plain.html
el.theme = theme === 'light' ? 'light' : 'dark';
el.config = { stageDomainsMap }; // optional: prod → stage host mapping
container.appendChild(el);
```

- **`path`** — URL whose response is plain HTML with Milo-style blocks.
- **`theme`** — `light` | `dark` (S2 / context).
- **`config`** — Optional `{ stageDomainsMap?: Record<string, string> }`. Host config is read from **`el.config` only** (no callback API).

### Listen for `boost-event`

Bubbling, composed events on **`boost-event`**; `detail`: `{ type, subType?, data? }`. Attach on an ancestor of the element.

---

## Event contract

| type | subType | data | Purpose |
|------|---------|------|---------|
| `system` | `loading` | — | Fragment fetch started |
| `system` | `loaded` | `{ contentId?, contentName?, … }` | Fragment ready (from page metadata + context) |
| `system` | `error` | `{ message }` | Fetch or render failed |
| `navigation` | `url` | `{ href }` | Link/CTA; host opens URL or handles deep link |
| `analytics` | `track` | `{ eventType, subtype, contentAction?, … }` | Host forwards to analytics |

Hosts should handle these for consistent navigation, analytics, and error UX.

---

## Block types

Parsed from plain HTML (`div.<block-name>`, sections).

| Block | Rendered | Notes |
|-------|----------|--------|
| **text** | Yes | Headings, body, lists |
| **row-card** | Yes | Card, image, CTA |
| **adobetv** | Yes | Adobe TV / mp4 |
| **page-metadata** | No | Key-value (style, analytics); feeds loaded payload |
| **html** | Yes | Raw HTML segments |

---

## Repo layout

| Path | Role |
|------|------|
| `init.js` | Lit **`<boost-content>`**, Typekit when needed, `resolveHostConfig` / `stageDomainsMap`, fragment load → parse → React |
| `bundle-entry.js` | Webpack entry: init + full-page script |
| `scripts/scripts.js` | `loadPage(document)` when `BUILD_MODE === 'dynamic'` |
| `head.html` | Sample: `BUILD_MODE`, import map (ESM preview), script tag |
| `404.html` | Minimal 404 shell |
| `components/BlockContainer.jsx` | S2 `Provider` + segment routing |
| `components/ContentRenderer.jsx`, `CtaButton.jsx` | Block rendering / CTAs |
| `blocks/*.jsx` | Text, RowCard, AdobeTv |
| `utils/parsePlainHtml.js`, `utils/utils.js`, `textBlockLogic.js`, `fetchMedia.js`, `types.js` | Parsing, events (`BOOST_EVENT`), helpers |
| `context/boostContext.js` | Theme, container, dispatch |
| `styles/*.css` | Typography + app styles (prefix-wrapped in build) |
| `postcss.config.mjs` | ESM PostCSS config: `postcss-prefixwrap('.boost-blocks')` |
| `webpack.config.cjs` | Production bundle, loaders (incl. `no-s2-scaling-loader.cjs`) |
| `scripts/no-s2-scaling-loader.cjs`, `strip-s2-touch-scaling.cjs` | Normalize S2 touch-target scaling when bundling |
| `.eslintrc.cjs` | ESLint (airbnb-base + React) |

Source files include the standard **Adobe confidential / copyright** header block expected for this codebase.

**Dependencies note:** `postcss-prefixwrap` is a **`dependencies`** entry (not only devDependencies) because it is required from `postcss.config.mjs` and satisfies `import/no-extraneous-dependencies` when linting config.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Webpack production → `dist/da-xe-surfaces.js` |
| `npm run lint` | ESLint (`.js`, `.jsx`, `.cjs`, `.mjs`) + Stylelint (`blocks/**/*.css`, `styles/*.css`) |

---

## Fonts

Uses Typekit kit **`bwx4ctj`** and `Typekit.load()` when no Typekit script is already on the page. If your app already loads Typekit, this package skips injecting a second script.
