/*
Copyright 2019 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @fileoverview An implementation of dynamically assembling assets from a set
 * of chunks and a chunk dependency graph. The main input data structures are:
 *
 * - `Chunkset`: Describes the chunk contents and their relationship.
 * - `AssemblyOptions`: A "query" against the chunkset that determines which
 *                      chunks are rendered and how.
 */

/**
 * Used to properly encode chunk data and set content-type headers.
 */
export enum ContentType {
  JS_SCRIPT = 'js',
  JS_MODULE = 'mjs',
  STYLESHEET = 'css',
}

/**
 * Options for assembling assets from a chunkset. These would typically be
 * extracted from URL parameters or from CLI flags.
 */
export interface AssemblyOptions {
  chunkIds: number[];
  chunkNames: string[];
  contentType: ContentType;
  includeDeps: boolean;
}

/**
 * A part or fragment of a chunk that may be conditionally included.
 */
export interface Part {
  getBody(): Uint8Array;
  dependsOn: number[];
}

/**
 * A chunk is a loadable unit of code. Each chunk consists of `Part`s, zero or
 * more of which may actually be rendered for an individual request.
 */
export interface Chunk {
  name?: string;
  parts: Part[];
}

/**
 * The top-level data structure that represents both the contents of all chunks
 * and meta data about the chunks and their relationship.
 */
export interface Chunkset {
  names: Map<string, number>;
  chunks: Chunk[];
}

function* collectParts(
  chunkset: Chunkset,
  options: AssemblyOptions
): Generator<Part, void, undefined> {
  const { includeDeps } = options;
  const indices = options.chunkIds.concat(
    options.chunkNames.map(name => {
      const resolvedIndex = chunkset.names.get(name);
      if (resolvedIndex === undefined) {
        throw new Error(`Invalid chunk name ${name}`);
      }
      return resolvedIndex;
    })
  );

  const visited: Set<number> = new Set();

  function* visitChunk(index: number): Generator<Part, void, undefined> {
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

function concatArrays(arrays: Uint8Array[]): Uint8Array {
  let size = 0;
  for (const array of arrays) {
    size += array.byteLength;
  }

  const out = new Uint8Array(size);
  let offset = 0;
  for (const array of arrays) {
    out.set(array, offset);
    offset += array.length;
  }

  return out;
}

/**
 * Extracts chunk part contents from the given `chunkset` and renders them
 * into a full asset, according to the  `options`.
 */
export function assemble(
  chunkset: Chunkset,
  options: AssemblyOptions
): Uint8Array {
  const js: Uint8Array[] = [];

  for (const part of collectParts(chunkset, options)) {
    js.push(part.getBody());
  }

  return concatArrays(js);
}
