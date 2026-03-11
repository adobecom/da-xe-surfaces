const path = require('path');

module.exports = {
  entry: './bundle-entry.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'da-xe-surfaces.js',
  },
  devtool: 'source-map',
  mode: 'production',
  optimization: {
    minimize: true,
    splitChunks: false,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        include: [path.resolve(__dirname, 'blocks'), path.resolve(__dirname, 'styles')],
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
          { loader: path.resolve(__dirname, 'scripts/xe-replace-loader.js') },
        ],
      },
      {
        test: /\.css$/,
        exclude: [path.resolve(__dirname, 'blocks'), path.resolve(__dirname, 'styles')],
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        include: [path.resolve(__dirname, 'blocks'), path.resolve(__dirname, 'utils'), path.resolve(__dirname, 'scripts')],
        use: [
          { loader: path.resolve(__dirname, 'scripts/xe-replace-loader.js') },
          { loader: 'swc-loader' },
        ],
      },
      {
        test: /\.js$/,
        exclude: [/node_modules/, path.resolve(__dirname, 'blocks'), path.resolve(__dirname, 'utils'), path.resolve(__dirname, 'scripts')],
        use: { loader: 'swc-loader' },
      },
    ],
  },
  resolve: { extensions: ['.js'] },
};
