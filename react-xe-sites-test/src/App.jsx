import { useState } from 'react';

const DEFAULT_FRAGMENT =
  'https://main--da-xe-surfaces--adobecom.aem.page/index.plain.html';

export default function App() {
  const [path, setPath] = useState(DEFAULT_FRAGMENT);

  return (
    <main style={{ padding: '1rem 2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1>React + xe-sites</h1>
      <p>
        This page uses the <code>&lt;xe-sites&gt;</code> web component inside a
        React app (Option 1: bundler). The component loads a fragment and
        renders it in a Spectrum-themed container.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="fragment-path" style={{ display: 'block', marginBottom: 4 }}>
          Fragment URL (e.g. .plain.html or path)
        </label>
        <input
          id="fragment-path"
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: 14,
          }}
        />
      </div>

      <hr style={{ margin: '1.5rem 0' }} />

      {/* Custom element: React passes path as attribute */}
      <xe-sites path={path} />
    </main>
  );
}
