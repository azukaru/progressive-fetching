import webpack from 'webpack';

import BatchDynamicPlugin from './batch-dynamic-plugin';
import {serveBundle} from './middleware';

/**
 * Take "normal" webpack config that doesn't generate multiple initial requests,
 * adds settings that make it work for dynamic bundling.
 *
 * This assumes that the app will try to load `foo.js` for the entrypoint `foo`.
 *
 * @param {webpack.Configuration} config
 * @returns {webpack.Configuration}
 */
export function makeFinegrained(config) {
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
  config.output.chunkFilename = 'chunk.[id].js';
  config.output.filename = 'chunk.[id].js';

  config.plugins = config.plugins || [];
  config.plugins.push(new BatchDynamicPlugin());

  // @ts-ignore
  config.devServer = config.devServer || {};
  // @ts-ignore
  const previousAfter = config.devServer.after;
  // @ts-ignore
  config.devServer.after = (app, server) => {
    if (previousAfter) previousAfter(app, server);
    const {compiler} = server;
    app.use(serveBundle(compiler));
  };

  return config;
}
