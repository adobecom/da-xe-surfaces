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
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: 'swc-loader' },
      },
    ],
  },
  resolve:
  { extensions: ['.js'] },
};
