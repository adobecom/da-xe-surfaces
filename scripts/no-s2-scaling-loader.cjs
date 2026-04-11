/**
 * Webpack loader: strip S2 touch scaling from CSS (same as Nest's no-s2-scaling).
 * Apply after postcss-loader so one build works for both head.html and Nest.
 */
const { applyTransform } = require('./strip-s2-touch-scaling.cjs');

/** @type {import('webpack').LoaderDefinitionFunction} */
function loader(content) {
    return applyTransform({
        filePath: this.resourcePath,
        code: content,
    });
}

module.exports = loader;
