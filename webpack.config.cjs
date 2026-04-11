const path = require('path');
const macros = require('unplugin-parcel-macros');

const noS2ScalingLoader = path.resolve(
    __dirname,
    'scripts/no-s2-scaling-loader.cjs',
);

module.exports = (_env, argv) => ({
    entry: './bundle-entry.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'da-xe-surfaces.js',
    },
    devtool: argv.mode === 'production' ? 'hidden-source-map' : 'source-map',
    mode: 'production',
    optimization: {
        minimize: true,
        splitChunks: false,
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                include: [
                    path.resolve(__dirname, 'blocks'),
                    path.resolve(__dirname, 'styles'),
                ],
                use: ['style-loader', 'css-loader', noS2ScalingLoader, 'postcss-loader'],
            },
            {
                test: /\.css$/,
                exclude: [path.resolve(__dirname, 'blocks'), path.resolve(__dirname, 'styles')],
                use: ['style-loader', 'css-loader', noS2ScalingLoader, 'postcss-loader'],
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: { presets: [['@babel/preset-react', { runtime: 'automatic' }]] },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.jsx'],
        fallback: {
            path: require.resolve('path-browserify'),
            url: require.resolve('url/'),
            fs: false,
        },
    },
    plugins: [
    // macros plugin must run before other syntax transformations like Babel
        macros.webpack(),
    ],
});
