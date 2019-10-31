'use strict';

/**
 * For type checking/completion purposes only. An `Object.assign` that forwards
 * the type of the first argument to the following arguments.
 *
 * @template T
 * @param {T} target
 * @param {T} overrides
 * @returns {T}
 */
function merge(target, overrides) {
  return Object.assign(target, overrides);
}

module.exports = {
  experimental: {
    granularChunks: true,
  },

  /**
   * @param {import('webpack').Configuration} config
   * @param {*} context
   */
  webpack(config, { isServer, dev /*, webpack */ }) {
    // TODO: Handle DLL plugin when building either the chunk list or the deps
    // inside of the chunkset.
    config.plugins = config.plugins.filter(plugin => {
      const {name} = plugin.constructor;
      return name !== 'AutoDLLPlugin';
    });

    if (isServer || dev) return config;

    // console.log(config.output);
    config.output.chunkFilename = 'static/chunks/[id].[contenthash].js';

    merge(config.optimization.splitChunks, {
      // Disable built-in next.js cache groups (e.g. commons)
      cacheGroups: {
        default: {
          chunks: 'all',
          minSize: 1,
          name: false,
          maxAsyncRequests: 100000,
          // TODO: Things start breaking once this goes over 5 which smells
          // like a fundamental issue is hiding behind this symptom.
          maxInitialRequests: 5,
          reuseExistingChunk: true,
          enforce: true,
        },
        vendors: false,
      },
    });

    return config;
  },
};
