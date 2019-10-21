import path from 'path';

import webpack from 'webpack';

const config: webpack.Configuration = {
  context: __dirname,
  entry: {
    'page-a': './app/page-a.js',
    'page-b': './app/page-b.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    chunkFilename: 'chunk.[id].js',
    publicPath: '/assets/',
  },
  optimization: {
    runtimeChunk: {
      name: 'runtime',
    },
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      name: false,
      cacheGroups: {
        default: false,
      },
    },
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'static'),
  },
};

export default config;
