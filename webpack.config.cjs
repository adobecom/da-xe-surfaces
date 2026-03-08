const path = require('path');

module.exports = {
  entry: './init.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  devtool: 'source-map',
  mode: process.env.NODE_ENV || 'production',
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
  resolve: {
    extensions: ['.js'],
  },
};
