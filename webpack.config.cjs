/********************************************************************
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 *******************************************************************/

const path = require('path');
const macros = require('unplugin-parcel-macros');
const noS2ScalingLoader = path.resolve(__dirname, 'scripts/no-s2-scaling-loader.cjs');

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
        include: path.resolve(__dirname, 'styles/typography.css'),
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.css$/,
        include: [path.resolve(__dirname, 'blocks'), path.resolve(__dirname, 'styles')],
        exclude: path.resolve(__dirname, 'styles/typography.css'),
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
          options: {
            presets: [['@babel/preset-react', { runtime: 'automatic' }]],
          },
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
};
