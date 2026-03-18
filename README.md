# da-xe-surfaces

Website foundation for rendering content blocks from **plain HTML** (Franklin/AEM-style). Runs in two modes:

- **head.html (full-page)** – Script drives the whole page: fetches the current path as `.plain.html`, parses it, and renders blocks into `main` or `body`.
- **Embedded (e.g. Nest)** – Host app loads the bundle and mounts the `<boost-content>` custom element with a `path` and `theme`; the element fetches that path as `.plain.html` and renders inside it. Events are dispatched as `boost-event` for the host to handle navigation, analytics, and errors.

One build (`dist/da-xe-surfaces.js`) is used for both. Content is expected as Milo-style block markup (sections with `div.<block-name>`). Blocks are rendered with React and Spectrum 2 (S2).

---

## Quick start

```bash
npm install
npm run build
```

Output: **`dist/da-xe-surfaces.js`** (and source map). This bundle includes the `<boost-content>` custom element, full-page script logic, S2 styles, and block React components. Use it from head.html or from a host app (e.g. Nest).

---

## Running with head.html (full-page mode)

head.html is the entry page when the **whole page** is driven by da-xe-surfaces (e.g. Milo/AEM or a standalone preview).

### 1. What head.html does

- Sets `window.app.BUILD_MODE = 'dynamic'` and loads the bundle as a module.
- When the bundle runs, it calls `loadPage(document)`: it resolves the **current URL path** to a `.plain.html` URL (e.g. `/` → `/index.plain.html`, `/foo` → `/foo.plain.html`), fetches that HTML, parses it into segments, and renders a single `<boost-content path="..." theme="...">` into `main` or `body`. So the **path** is derived from `window.location.pathname`.

### 2. Run locally

1. **Build** the bundle:
   ```bash
   npm run build
   ```

2. **Serve** the repo so that:
   - The document you open is `head.html` (or a page that uses the same script setup).
   - The script can load `/dist/da-xe-surfaces.js` from the same origin.
   - The server can respond to requests for `.plain.html` (e.g. `/index.plain.html`, `/some-path.plain.html`) with the corresponding plain HTML content.

   **Option A – Static server + same directory**

   - Put an `index.plain.html` (and any other `*.plain.html`) in the repo root or a path that matches the URL structure.
   - Serve the repo (e.g. `npx serve . -p 3000` or `python3 -m http.server 3000`).
   - Open `http://localhost:3000/head.html` (or configure the server so that the default document is `head.html` for `/`).
   - For the root path, the script will request `/index.plain.html`; ensure that URL returns valid block markup.

   **Option B – Milo/AEM (e.g. `aem up`)**

   - Use your usual Milo/AEM setup so that:
     - The site is served with the correct document root.
     - `head.html` (or equivalent) is the page that sets `BUILD_MODE = 'dynamic'` and loads `dist/da-xe-surfaces.js`.
     - Paths resolve to the right `.plain.html` documents (e.g. via AEM or a proxy).

3. **Theme** – The script reads theme from URL: `?theme=dark` or `#theme=dark` (default `light`).

### 3. Where changes show up

- **Code/block/UI changes:** Edit source in `init.js`, `blocks/`, `components/`, `utils/`, etc. Run **`npm run build`** again. Refresh the page that loads `dist/da-xe-surfaces.js`; the new bundle is loaded and changes appear on next load.
- **Content changes:** Change the **plain HTML** that is served for each path (e.g. `index.plain.html` or your AEM/Milo content). Reload the page (or re-open the path); the script re-fetches the `.plain.html` and re-renders. No rebuild needed for content-only changes.
- **head.html itself:** If you change `head.html` (e.g. script path or BUILD_MODE), refresh after saving; no build step for that file.

---

## Integrating in an app (e.g. Nest)

Use the **same** `dist/da-xe-surfaces.js` bundle. The host app loads it and mounts the custom element; the element fetches the given path as `.plain.html` and renders inside it. The host listens for **`boost-event`** to handle navigation, analytics, and errors.

### 1. Load the bundle

Load the script once (e.g. when the host view mounts). Example (Nest/Boost-style):

- **Development:** Point at your local build, e.g. `http://localhost:3000/dist/da-xe-surfaces.js` (serve da-xe-surfaces on 3000 and run the app so it can load that URL).
- **Production:** Point at a deployed bundle URL (e.g. from your CDN or AEM branch).

Example with dynamic import:

```javascript
const BOOST_SCRIPT_URL = 'http://localhost:3000/dist/da-xe-surfaces.js'; // or your deployed URL
import(/* webpackIgnore: true */ BOOST_SCRIPT_URL)
  .then(() => setBoostReady(true))
  .catch((err) => console.error('Failed to load boost-content bundle', err));
```

This registers the **`<boost-content>`** custom element globally. (The tag name must include a hyphen per Custom Elements spec.)

### 2. Render the element

When the script has loaded, create the custom element with a **path** (URL or path to the fragment) and **theme**. Set properties on the element before appending (imperative embed is reliable for object props like `config`):

```javascript
const el = document.createElement('boost-content');
el.path = url;
el.theme = theme === 'light' ? 'light' : 'dark';
el.config = { stageDomainsMap }; // optional: non-prod stage domain mapping
container.appendChild(el);
```

- **path** – Full URL to a `.plain.html` document, or a path that your backend serves as plain HTML (e.g. `/fragments/panel.plain.html`). The element will fetch it and parse/render the blocks.
- **theme** – `light` or `dark`; applied to the S2 Provider and context.
- **config** – Optional `{ stageDomainsMap? }` for non-prod stage domain mapping.

### 3. Listen for events

The element dispatches **`boost-event`** (bubbling, composed). Listen on a container that includes the element:

```javascript
container.addEventListener('boost-event', (ev) => {
  const { type, subType, data } = ev.detail || {};
  if (type === 'system') {
    if (subType === 'loaded') {
      // data: { contentId, contentName }
    }
    if (subType === 'loading') { /* show loading */ }
    if (subType === 'error') {
      // data: { message }
    }
  }
  if (type === 'navigation' || type === 'analytics') {
    // Handle link/CTA: open URL, send analytics, etc.
  }
});
```

See **Event contract** below (and `docs/REACT_BLOCKS_MIGRATION.md`) for full payload shapes.

### 4. Nest (Boost) example

- **Constants:** Define the script URL (e.g. `BOOST_SCRIPT_URL` or `BOOST_SCRIPT_URL`) and the default plain HTML URL (e.g. `DEFAULT_PLAIN_HTML_URL`).
- **Load:** In the Boost view, `import(/* webpackIgnore: true */ BOOST_SCRIPT_URL)` in a `useEffect` and set a state (e.g. `boostReady`) when the import resolves.
- **Render:** Use a container ref and in an effect create `boost-content` with `document.createElement('boost-content')`, set `path`, `theme`, and `config` (if needed), then append. On url/theme change, update the element’s properties; on unmount, remove the element.
- **Events:** Attach a `boost-event` listener (e.g. on the dialog/container ref) and delegate to your handler (e.g. BoostEventHandler) for loading, loaded, error, navigation, and analytics.

### 5. Where changes show up (embedded)

- **da-xe-surfaces code:** Change source in da-xe-surfaces, run **`npm run build`** in that repo. If the app points at the local bundle (e.g. `http://localhost:3000/dist/da-xe-surfaces.js`), refresh the app page to load the new bundle; changes appear on next load. If the app uses a deployed URL, deploy the new `dist/da-xe-surfaces.js` and refresh.
- **Host app code:** Change the Nest (or other host) app as usual; rebuild/refresh the host. No need to rebuild da-xe-surfaces unless you changed it.
- **Content:** Change the plain HTML served at the `path` URL. Reload or re-open the flow; the element will fetch the updated HTML and re-render. No rebuild of either repo for content-only changes.

---

## How changes appear (summary)

| What you change | Where it appears | What you do |
|-----------------|------------------|-------------|
| Block components, init, styles, scripts in **da-xe-surfaces** | head.html and any app that loads the bundle | `npm run build` in da-xe-surfaces, then refresh the page that loads the bundle |
| **head.html** or page that sets BUILD_MODE and loads the script | Full-page mode only | Edit file, refresh; no build |
| **Plain HTML** content (e.g. index.plain.html or AEM content) | Both head.html and embedded | Edit content / republish; refresh or re-open the path |
| **Host app** (e.g. Nest) – views, event handlers, script URL | Embedded only | Build/refresh the host app |

---

## Event contract

All events use the name **`boost-event`** and a `detail` object: `{ type, subType?, data? }`.

| type     | subType   | data | Purpose |
|----------|-----------|------|--------|
| `system` | `loading` | –    | Fragment fetch started |
| `system` | `loaded`  | `{ contentId?, contentName? }` | Fragment rendered; from page-metadata |
| `system` | `error`   | `{ message }` | Fetch or render failed |
| `navigation` | –     | `{ href, openInNewTab?, contentId? }` | Link/CTA clicked; host should navigate or open URL |
| `analytics`  | `track` | `{ eventType, subtype, contentAction?, … }` | Analytics event for host to send |

The host should listen on a parent of `<boost-content>` and handle these so that navigation, analytics, and error handling are consistent with the rest of the app.

---

## Block types

Parsed from plain HTML (Milo-style sections and `div.<block-name>`).

| Block | Rendered | Notes |
|-------|----------|--------|
| **text** | Yes | Headings, body, lists; size/accents via classes |
| **row-card** | Yes | Card with optional image, CTA, S2 styling |
| **adobetv** | Yes | Video embed (video.tv.adobe.com or .mp4); play analytics |
| **page-metadata** | No | Key-value (e.g. style, analyticsParams); drives theme and loaded payload |
| **html** | Yes | Raw HTML segments in a wrapper |

---

## Repo layout (main)

| Path | Role |
|------|------|
| **init.js** | Lit custom element `<boost-content>`, font loading, fragment fetch, parse → React render |
| **bundle-entry.js** | Entry for release bundle: init + scripts/scripts.js |
| **scripts/scripts.js** | Full-page: `loadPage()`, runs when `BUILD_MODE === 'dynamic'` |
| **head.html** | Sample page: sets BUILD_MODE, loads dist/da-xe-surfaces.js |
| **components/BlockContainer.jsx** | S2 Provider + segment → TextBlock, RowCardBlock, AdobeTvBlock, html |
| **utils/parsePlainHtml.js** | HTML → segments (blocks, metadata, raw html) |
| **context/boostContext.js** | Theme, baseUrl, pageMetadata, event dispatch |
| **styles/** | Typography and layout; PostCSS prefixwrap for `.boost-blocks` |
| **scripts/no-s2-scaling-loader.cjs** | Webpack loader: strip S2 touch scaling (same behavior as Nest) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Webpack production build → `dist/da-xe-surfaces.js` |
| `npm run lint` | ESLint + Stylelint |
| `npm test` | Run tests |

---

## Fonts

Fonts use the same approach as Nest: Typekit script `bwx4ctj` and `Typekit.load()`. If a Typekit script is already on the page (e.g. in Nest), da-xe-surfaces does not inject another and relies on the host’s fonts. S2 and blocks expect Adobe Clean.

---

For Nest integration details and event payloads, see **docs/REACT_BLOCKS_MIGRATION.md**.
