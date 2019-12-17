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

import path from 'path';

import webpack from 'webpack';

import { Chunk, Chunkset } from 'asset-assembler';

function notNull<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected value to be non-null');
  }
  return value;
}

/**
 * Create a Chunkset data structure from webpack's build output.
 *
 * The implementation currently assumes that all chunks have numeric chunk ids
 * without any gaps between chunk ids.
 */
export function buildChunksetFromCompilation(
  fs: webpack.InputFileSystem,
  outputPath: string,
  compilation: webpack.compilation.Compilation
): Chunkset {
  const names = new Map<string, number>();
  const chunkMapping = new Map<webpack.compilation.Chunk, Chunk>();

  const chunks: Chunk[] = [];

  const sortedChunks = [
    ...(compilation.chunks as webpack.compilation.Chunk[]),
  ].sort((a, b) => {
    if (typeof a.id !== 'number' || typeof b.id !== 'number') {
      throw new Error('Only numeric chunk ids are supported');
    }
    return a.id - b.id;
  });

  for (const webpackChunk of sortedChunks) {
    const chunkIdx = chunks.length;
    if (chunkIdx !== webpackChunk.id) {
      // This may happen if there are holes in the chunk ids
      throw new Error(
        `Expected chunk id ${chunkIdx} but found ${webpackChunk.id}`
      );
    }
    if (webpackChunk.name) {
      names.set(webpackChunk.name, chunkIdx);
    }
    const chunk = {
      parts: webpackChunk.files.map(filename => {
        return {
          key: -1,
          dependsOn: [],
          getBody(): Buffer {
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

  // TODO(jankrems): Support this for all chunkGroups, not just entrypoints?
  for (const [name, entrypoint] of compilation.entrypoints) {
    const depChunks = [...entrypoint.chunks];
    const entryChunk = depChunks.pop();

    // Ensure we map the proper things
    if (entryChunk.name !== name) {
      throw new Error('Unexpected chunk name, should match entrypoint');
    }

    const chunk = notNull(chunkMapping.get(entryChunk));
    for (const depChunk of depChunks) {
      const chunkIdx = chunks.indexOf(notNull(chunkMapping.get(depChunk)));
      chunk.parts[0].dependsOn.push(chunkIdx);
    }
  }

  return {
    names,
    chunks,
  };
}
