# Milo goes to college
Use this project template to create a Milo site on DA! [milo-college](https://github.com/adobecom/milo-college) is the Sharepoint equivalent to this project.

## Steps

1. Copy existing [`college`](https://adobe.sharepoint.com/:f:/r/sites/adobecom/Shared%20Documents/demos/college) content folder to your sharepoint and give helix@adobe.com View access
2. Click "[Use this template](https://github.com/adobecom/milo-college/generate)" Github button on this project.
3. Install the [AEM Code Sync Bot](https://github.com/apps/aem-code-sync)

From your newly created project

1. Install the [Helix Bot](https://github.com/apps/helix-bot/installations/new).
2. Change the fstab.yaml file to point to your content.
3. Add the project to the [Helix Sidekick](https://github.com/adobe/helix-sidekick).
4. Start creating your content.

## Developing
1. Install the [Helix CLI](https://github.com/adobe/helix-cli): `sudo npm install -g @adobe/aem-cli`
1. Run `aem up` this repo's folder. (opens your browser at `http://localhost:3000`)
1. Open this repo's folder in your favorite editor and start coding.

## Testing
```sh
npm run test
```
or:
```sh
npm run test:watch
```
This will give you several options to debug tests. Note: coverage may not be accurate.

## Using xe-sites in another repo

The `<xe-sites>` web component loads and renders a fragment (`.plain.html`) inside a Spectrum-themed container. Other repos can use it in one of these ways:

### 1. npm dependency (recommended when using a bundler)

Install the package (from npm if published, or from Git):

```bash
# If published to npm:
npm install @adobecom/da-xe-surfaces

# Or from Git (replace with your repo URL):
npm install git+https://github.com/adobecom/da-xe-surfaces.git
```

**Peer dependencies** (install in the consuming repo if not already present; versions aligned with nest):

```bash
npm install lit@^2.7.3 @spectrum-web-components/theme@0.47.2 @spectrum-web-components/button@0.47.2
```

**In your app:** Import the main module so your bundler (webpack, Vite, etc.) bundles it and its CSS:

```js
import '@adobecom/da-xe-surfaces';
```

Then use the custom element in HTML or in your framework’s template:

```html
<xe-sites path="/path/to/fragment"></xe-sites>
```

Or with an absolute URL (for cross-origin, set `window.xeSitesFragmentProxy` to a proxy URL; see `xe-sites-test.html`):

```html
<xe-sites path="https://main--your-site--adobecom.aem.page/index.plain.html"></xe-sites>
```

The package `main` is `init.js`, which imports Lit, Spectrum components, and CSS. The consuming app’s bundler must resolve those (and handle CSS). If the other repo does **not** use a bundler, use option 2.

### 2. Script tag + link tags (no bundler)

Load the component and its styles from a URL (e.g. your deployed da-xe-surfaces or a CDN):

- Add an [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) for `lit` and `@spectrum-web-components/*` (see `xe-sites-test.html` or `head.html`).
- Load all required CSS with `<link rel="stylesheet" href="...">` (see the list in `xe-sites-test.html`).
- Load the **browser** entry (no CSS imports) as a module:  
  `<script type="module" src="https://your-origin/init-browser.js"></script>`  
  You must host/serve `init-browser.js` and the rest of the repo (or a built bundle that exposes the same entry).

Option 1 is simpler if the other repo already uses a bundler.

**React test app (in this repo):** A small Vite + React app in `react-xe-sites-test/` demonstrates Option 1. From the repo root:

```sh
cd react-xe-sites-test && npm install && npm run dev
```

Then open http://localhost:5174 and use the input to change the fragment URL.

### 3. Optional: fragment proxy for cross-origin

When the fragment URL is on another origin, the browser may block the request (CORS). The host page can set a proxy so the request goes through the same origin or a CORS-enabled proxy:

```js
// Before loading the xe-sites script:
window.xeSitesFragmentProxy = 'https://your-backend-proxy/?url=';
// Or a function: window.xeSitesFragmentProxy = (url) => 'https://your-proxy/?url=' + encodeURIComponent(url);
```

## Security
1. Create a Service Now ID for your project via [Service Registry Portal](https://adobe.service-now.com/service_registry_portal.do#/search)
2. Update the `.kodiak/config.yaml` file to make sure valid team members are assigned security vulnerability Jira tickets.
