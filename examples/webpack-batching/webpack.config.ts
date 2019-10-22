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
    publicPath: '/assets/',
  },
  optimization: {
    // Optionally, set runtime chunk.
    runtimeChunk: 'single',
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'static'),
  },
};

/**
 * Take "normal" webpack config that doesn't generate multiple initial requests,
 * adds settings that make it work for dynamic bundling.
 *
 * This assumes that the app will try to load `foo.js` for the entrypoint `foo`.
 */
function makeFinegrained(config: webpack.Configuration): webpack.Configuration {
  config.optimization = config.optimization || {};
  config.optimization.splitChunks = config.optimization.splitChunks || {};

  Object.assign(config.optimization.splitChunks, {
    chunks: 'all',
    minSize: 1,
    maxAsyncRequests: 100000,
    maxInitialRequests: 100000,
  });
  // Force numeric chunk ids
  if (!config.optimization.chunkIds || config.optimization.chunkIds === 'named') {
    config.optimization.chunkIds = 'natural';
  }

  config.output = config.output || {};
  // TODO: Make this remote compatible with potential existing configs.
  config.output.chunkFilename = 'chunk.[name].js';

  config.devServer = config.devServer || {};
  const previousAfter = config.devServer.after;
  config.devServer.after = (app, server) => {
    if (previousAfter) previousAfter(app, server);
    const {compiler} = server as unknown as {compiler: webpack.Compiler};
    app.use(serveBundle(compiler));
  };

  return config;
}

export default makeFinegrained(config);
