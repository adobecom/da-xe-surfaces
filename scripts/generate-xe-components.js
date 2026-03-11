#!/usr/bin/env node
/**
 * Generates xe-*.js wrapper files from xe-components.config.cjs or auto-detects from package.json.
 * Run on prebuild. Dev writes sp-* in code; webpack loader replaces at build time.
 *
 * Config optional: if xe-components.config.cjs has entries, use it. Otherwise auto-detect
 * @spectrum-web-components/* from package.json dependencies.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** kebab-case to PascalCase: "split-button" -> "SplitButton" */
function toPascalCase(str) {
  return str
    .split('-')
    .map((s) => s[0].toUpperCase() + (s.slice(1) || '').toLowerCase())
    .join('');
}

/** Auto-detect SWC components from package.json dependencies. */
function autoDetectFromPackageJson() {
  const pkgPath = join(root, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return {};
  }
  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
  const config = {};
  for (const [name] of Object.entries(deps)) {
    if (!name.startsWith('@spectrum-web-components/')) continue;
    const pkgName = name.replace('@spectrum-web-components/', '');
    const spTag = `sp-${pkgName}`;
    const exportName = toPascalCase(pkgName);
    config[spTag] = { package: name, export: exportName };
  }
  return config;
}

/** Resolve config: manual config or auto-detect from package.json. */
function resolveConfig() {
  const configPath = join(root, 'xe-components.config.cjs');
  let manualConfig = {};
  try {
    manualConfig = require(configPath);
  } catch {
    return autoDetectFromPackageJson();
  }
  manualConfig = manualConfig?.default || manualConfig;
  if (!manualConfig || typeof manualConfig !== 'object') {
    return autoDetectFromPackageJson();
  }
  // If autoDetect: true, ignore manual entries and use package.json
  if (manualConfig.autoDetect === true) {
    return autoDetectFromPackageJson();
  }
  // Use manual entries (filter out autoDetect key)
  const entries = Object.entries(manualConfig).filter(
    ([, spec]) => typeof spec === 'object' && spec?.package && spec?.export
  );
  if (entries.length === 0) {
    return autoDetectFromPackageJson();
  }
  return Object.fromEntries(entries);
}

const config = resolveConfig();
const entries = Object.entries(config);

if (entries.length === 0) {
  console.warn('No xe-components to generate. Add @spectrum-web-components/* to package.json or create xe-components.config.cjs');
  writeFileSync(join(root, 'xe-components.js'), `/** No xe-components configured. */\n`);
  writeFileSync(join(root, 'xe-components.tags.cjs'), 'module.exports = [];\n');
  process.exit(0);
}

const generated = [];

for (const [spTag, spec] of entries) {
  if (typeof spec !== 'object' || !spec.package || !spec.export) {
    console.warn(`Skipping ${spTag}: invalid spec`);
    continue;
  }
  const xeTag = spTag.replace('sp-', 'xe-');
  const content = `/**
 * ${xeTag}: xe-sites-specific element (isolated from host ${spTag}).
 * Auto-generated. Do not edit.
 */
import { ${spec.export} } from '${spec.package}';

if (!customElements.get('${xeTag}')) {
  customElements.define('${xeTag}', ${spec.export});
}
`;
  const outPath = join(root, `${xeTag}.js`);
  writeFileSync(outPath, content);
  generated.push(xeTag);
}

// Generate xe-components.js that imports all
const indexContent = `/**
 * xe-components: xe-sites-specific SWC wrappers.
 * Auto-generated. Do not edit.
 */
${generated.map((tag) => `import './${tag}.js';`).join('\n')}
`;
writeFileSync(join(root, 'xe-components.js'), indexContent);

// Write tags list for xe-replace-loader (prebuild runs before build)
const tags = generated.map((t) => t.replace('xe-', 'sp-'));
writeFileSync(
  join(root, 'xe-components.tags.cjs'),
  `/** Auto-generated. List of sp-* tags to replace with xe-* at build time. */\nmodule.exports = ${JSON.stringify(tags)};\n`
);

console.log(`Generated: ${generated.join(', ')}`);
