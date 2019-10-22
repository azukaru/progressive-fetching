import path from 'path';

import webpack from 'webpack';

import {serveBundle} from './assembler/middleware';

const config: webpack.Configuration = {
  context: __dirname,
  entry: {
    'page-a': './app/page-a.js',
    'page-b': './app/page-b.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    chunkFilename: 'chunk.[name].js',
    publicPath: '/assets/',
  },
  optimization: {
    runtimeChunk: {
      name: 'chunk.runtime',
    },
    splitChunks: {
      chunks: 'all',
      minSize: 1,
      maxAsyncRequests: 100000,
      maxInitialRequests: 100000,
    },
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'static'),
    after(app, server) {
      const {compiler} = server as unknown as {compiler: webpack.Compiler};
      app.use(serveBundle(compiler));
    },
  },
};

export default config;
