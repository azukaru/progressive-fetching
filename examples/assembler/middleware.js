'use strict';

const path = require('path');

const webpack = require('webpack');

const {assemble, ContentTypes} = require('./assemble');

/**
 * @typedef {import('./assemble').AssemblyOptions} AssemblyOptions
 * @typedef {import('./assemble').Chunk} Chunk
 * @typedef {import('./assemble').Chunkset} Chunkset
 */

/**
 * @param {import('webpack').InputFileSystem} fs
 * @param {string} outputPath
 * @param {import('webpack').compilation.Compilation} compilation
 * @returns {Chunkset}
 */
function buildChunksetFromCompilation(fs, outputPath, compilation) {
  /** @type {Map<string, number>} */
  const names = new Map();
  /** @type {Map<any, Chunk>} */
  const chunkMapping = new Map();

  /** @type {Chunk[]} */
  const chunks = [];

  const sortedChunks = [
    ...(/** @type {webpack.compilation.Chunk[]} */ (compilation.chunks))
  ].sort(
    (a, b) => {
      if (typeof a.id !== 'number' || typeof b.id !== 'number') {
        throw new Error('Only numeric chunk ids are supported');
      }
      return a.id - b.id;
    }
  );

  for (const webpackChunk of sortedChunks) {
    const chunkIdx = chunks.length;
    if (chunkIdx !== webpackChunk.id) {
      // This may happen if there are holes in the chunk ids
      throw new Error(`Expected chunk id ${chunkIdx} but found ${webpackChunk.id}`);
    }
    if (webpackChunk.name) {
      names.set(webpackChunk.name, chunkIdx);
    }
    const chunk = {
      parts: webpackChunk.files.map(filename => {
        return {
          key: -1,
          dependsOn: [],
          getBody() {
            const absoluteFile = path.resolve(outputPath, filename);
            const fileContents = fs.readFileSync(absoluteFile);
            return fileContents;
          },
        };
      }),
    };
    chunkMapping.set(webpackChunk, chunk);
    chunks.push(chunk);
  }

  // TODO: Support this for all chunkGroups, not just entrypoints?
  for (const [name, entrypoint] of compilation.entrypoints) {
    const depChunks = [...entrypoint.chunks];
    const entryChunk = depChunks.pop();

    // Ensure we map the proper things
    if (entryChunk.name !== name) {
      throw new Error('Unexpected chunk name, should match entrypoint');
    }

    const chunk = chunkMapping.get(entryChunk);
    for (const depChunk of depChunks) {
      const chunkIdx = chunks.indexOf(chunkMapping.get(depChunk));
      chunk.parts[0].dependsOn.push(chunkIdx);
    }
  }

  return {
    names,
    chunks,
  };
}

export function serveBundle(compiler) {
  const outputOptions = compiler.options.output;
  // We know that the FS supports both input and output methods.
  /** @type {webpack.InputFileSystem} */
  const outFS = compiler.outputFileSystem;

  let chunkset = null;
  compiler.hooks.emit.tap('DevServer', compilation => {
    chunkset = buildChunksetFromCompilation(outFS, outputOptions.path, compilation);
  });

  return (req, res, next) => {
    if (req.url.startsWith(outputOptions.publicPath)) {
      const assetPath = req.url.slice(outputOptions.publicPath.length);

      const jsEntryName = assetPath.endsWith('.js') ? assetPath.slice(0, -3) : null;
      if (jsEntryName !== null && chunkset.names.has(jsEntryName)) {
        /** @type {AssemblyOptions} */
        const options = {
          chunkNames: [jsEntryName],
          chunkIds: [],
          contentType: ContentTypes.JS_SCRIPT,
          includeDeps: true,
        };

        // TODO: Properly send the content
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.send(assemble(chunkset, options));
        return;
      }

      if (jsEntryName && jsEntryName.startsWith('chunk.')) {
        const chunkIds = jsEntryName
          .slice('chunk.'.length)
          .split(',')
          .map(id => parseInt(id, 10));

        /** @type {AssemblyOptions} */
        const options = {
          chunkNames: [],
          chunkIds: chunkIds,
          contentType: ContentTypes.JS_SCRIPT,
          includeDeps: false,
        };

        // TODO: Properly send the content
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.send(assemble(chunkset, options));
        return;
      }
    }
    next();
  };
}
