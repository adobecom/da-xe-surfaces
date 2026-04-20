# da-xe-surfaces (`@adobecom/da-xe-surfaces`)

A self-contained web component that renders Milo-style content blocks from plain HTML. Load the bundle once and mount **`<boost-content>`** anywhere.

---

## Usage

Load `dist/da-xe-surfaces.js` once:

```js
import('@adobecom/da-xe-surfaces/dist/da-xe-surfaces.js');
```

Then mount the element:

```javascript
const el = document.createElement('boost-content');
el.path = fragmentUrl;         // URL to .plain.html content
el.theme = 'light';            // 'light' | 'dark'
el.env = env;                  // environment string
el.config = { stageDomainsMap }; // optional: prod → stage host mapping
container.appendChild(el);
```

---

## Events

Listen for `boost-event` on an ancestor of the element:

| type | subType | data | Purpose |
|------|---------|------|---------|
| `system` | `loading` | — | Fragment fetch started |
| `system` | `loaded` | `{ contentId?, contentName?, … }` | Fragment ready |
| `system` | `error` | `{ message }` | Fetch or render failed |
| `navigation` | `url` | `{ href }` | Link/CTA click |
| `analytics` | `track` | `{ eventType, subtype, contentAction?, … }` | Analytics event |

---

## Block types

| Block | Notes |
|-------|-------|
| **text** | Headings, body, lists |
| **row-card** | Card, image, CTA |
| **adobetv** | Adobe TV / mp4 |
| **page-metadata** | Key-value; feeds loaded payload |
| **html** | Raw HTML segments |
