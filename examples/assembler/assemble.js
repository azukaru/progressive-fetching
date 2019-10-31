'use strict';

const JS_SCRIPT = 0;
const JS_MODULE = 1;
const STYLESHEET = 2;

/**
 * @typedef {typeof JS_SCRIPT | typeof JS_MODULE | typeof STYLESHEET} ContentType
 */

/** @type {{ JS_SCRIPT: typeof JS_SCRIPT, JS_MODULE: typeof JS_MODULE, STYLESHEET: typeof STYLESHEET }} */
const ContentTypes = { JS_SCRIPT, JS_MODULE, STYLESHEET };
exports.ContentTypes = ContentTypes;

/**
 * @typedef AssemblyOptions
 * @prop {number[]} chunkIds
 * @prop {string[]} chunkNames
 * @prop {ContentType} contentType
 * @prop {boolean} includeDeps
 */

/**
 * @typedef Part
 * @prop {() => Uint8Array} getBody
 * @prop {number[]} dependsOn
 */

/**
 * @typedef Chunk
 * @prop {string=} name
 * @prop {Part[]} parts
 */

/**
 * @typedef Chunkset
 * @prop {Map<string, number>} names
 * @prop {Chunk[]} chunks
 */

/**
 * @param {Chunkset} chunkset
 * @param {AssemblyOptions} options
 * @returns {Generator<Part>}
 */
function* collectParts(chunkset, options) {
  const {includeDeps} = options;
  const indices = options.chunkIds.concat(options.chunkNames.map(name => {
    return chunkset.names.get(name);
  }));

  /** @type {Set<number>} */
  const visited = new Set();

  /**
   * @param {number} index
   */
  function* visitChunk(index) {
    if (visited.has(index)) return;
    visited.add(index);

    const chunk = chunkset.chunks[index];

    const ownParts = [];

    for (const ownPart of chunk.parts) {
      ownParts.push(ownPart);
      if (!includeDeps) continue;

      for (const depIdx of ownPart.dependsOn) {
        yield* visitChunk(depIdx);
      }
    }

    yield* ownParts;
  }

  for (const index of indices) {
    yield* visitChunk(index);
  }
}

/**
 * @param {Chunkset} chunkset
 * @param {AssemblyOptions} options
 * @returns {Uint8Array}
 */
function assemble(chunkset, options) {
  /** @type {Uint8Array[]} */
  const js = [];

  for (const part of collectParts(chunkset, options)) {
    js.push(part.getBody());
  }

  return Buffer.concat(js);
}
exports.assemble = assemble;
