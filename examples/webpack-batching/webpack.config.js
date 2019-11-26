'use strict';

const path = require('path');

const config = {
    context: __dirname,
    entry: {
        'page-a': './app/page-a.js',
        'page-b': './app/page-b.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/assets/',
    },
    optimization: {
        // Optionally, set runtime chunk.
        // runtimeChunk: 'single',
    },
    devServer: {
        contentBase: path.resolve(__dirname, 'static'),
        hot: true,
        overlay: true,
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
};
module.exports = config;
