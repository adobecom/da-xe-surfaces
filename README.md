# da-xe-surfaces

Website foundation technology for DA (Digital Assistant) surfaces. Provides the `<xe-sites>` web component and block system for rendering Milo-style content in Spectrum-themed layouts. Used by both **head.html** (Milo/AEM full-page) and **Nest** (e.g. Boost applet).

## Architecture

- **`<xe-sites>`** — LitElement web component that fetches a fragment (`.plain.html`), wraps it in `sp-theme`, and runs block decorators.
- **Block registry** — `window.xeBlockRegistry` maps block names to decorator functions. Blocks transform table-based markup into final UI.
- **Bundle** — Webpack builds `dist/da-xe-surfaces.js` from `bundle-entry.js`, which imports `init.js` (xe-sites + SWC) and `scripts/scripts.js` (full-page logic).

### Two modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Dynamic** (head.html) | `BUILD_MODE === 'dynamic'` in head | `scripts.js` wraps the page in `sp-theme`, runs `loadArea(main)`, decorates blocks. Theme from URL: `?theme=dark` or `#theme=dark`. |
| **Builtin** (Nest) | `BUILD_MODE === 'builtin'` (default) | Host renders `<xe-sites path="..." theme="dark">`. Component loads fragment and decorates blocks. Theme from `theme` prop. |

### head.html

`head.html` sets `BUILD_MODE = "dynamic"` and loads:

```html
<link rel="stylesheet" href="/styles/styles.css"/>
<script type="module" src="/dist/da-xe-surfaces.js"></script>
```

The bundle includes Spectrum Web Components (sp-theme, sp-button), block logic, and full-page scripts. No import map or separate SWC scripts are needed.

### Blocks

| Block | Purpose |
|-------|---------|
| `page-metadata` | Page-level metadata (padding, theme) |
| `row-card` | Row layout with icon, title, description |
| `text` | Typography (headings, body) |
| `adobetv` | Adobe TV embed |

## Developing

1. Install the [Helix CLI](https://github.com/adobe/helix-cli): `sudo npm install -g @adobe/aem-cli`
2. Run `aem up` in this repo's folder. (Opens browser at `http://localhost:3000`)
3. Run `npm run build` to rebuild `dist/da-xe-surfaces.js` after changes.

## Building

```sh
npm run build
```

Produces `dist/da-xe-surfaces.js` (and source map). Entry: `bundle-entry.js` → `init.js` + `scripts/scripts.js`.

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

### npm dependency (recommended when using a bundler)

Install the package:

```bash
npm install @adobecom/da-xe-surfaces
# Or from Git:
npm install git+https://github.com/adobecom/da-xe-surfaces.git
```

**Peer dependencies** (versions aligned with Nest):

```bash
npm install lit@^2.7.3 @spectrum-web-components/theme@0.47.2 @spectrum-web-components/button@0.47.2
```

**In your app:** Import so your bundler bundles it and its CSS:

```js
import '@adobecom/da-xe-surfaces';
```

Then use the custom element:

```html
<xe-sites path="/path/to/fragment.plain.html" theme="dark"></xe-sites>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `path` | string | Fragment URL (relative or absolute) |
| `theme` | `'light' \| 'dark'` | Overrides URL theme when set (e.g. from Boost) |
| `scale` | `'medium' \| 'large'` | sp-theme scale. Default `medium`. |
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

## Typography

Uses Spectrum tokens with Milo-aligned sizes. Heading/body presets: `.heading-xxxl` … `.heading-xxs`, `.body-xxl` … `.body-xxs`. See `styles/styles.css`.

## Security

1. Create a Service Now ID for your project via [Service Registry Portal](https://adobe.service-now.com/service_registry_portal.do#/search)
2. Update `.kodiak/config.yaml` so valid team members are assigned security vulnerability Jira tickets.
