'use strict';

export enum ContentType {
  JS_SCRIPT = 'js',
  JS_MODULE = 'mjs',
  STYLESHEET = 'css',
}

export interface AssemblyOptions {
  chunkIds: number[];
  chunkNames: string[];
  contentType: ContentType;
  includeDeps: boolean;
}

export interface Part {
  getBody(): Uint8Array;
  dependsOn: number[];
}

export interface Chunk {
  name?: string;
  parts: Part[];
}

export interface Chunkset {
  names: Map<string, number>;
  chunks: Chunk[];
}

function* collectParts(chunkset: Chunkset, options: AssemblyOptions): Generator<Part, void, undefined> {
  const {includeDeps} = options;
  const indices = options.chunkIds.concat(options.chunkNames.map(name => {
    const resolvedIndex = chunkset.names.get(name);
    if (resolvedIndex === undefined) {
      throw new Error(`Invalid chunk name ${name}`);
    }
    return resolvedIndex;
  }));

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

export function assemble(chunkset: Chunkset, options: AssemblyOptions): Uint8Array {
  const js: Uint8Array[] = [];

  for (const part of collectParts(chunkset, options)) {
    js.push(part.getBody());
  }

  return concatArrays(js);
}
