import path from 'path';

import webpack from 'webpack';

import {Chunk, Chunkset} from 'asset-assembler';

export function buildChunksetFromCompilation(fs: webpack.InputFileSystem,
  outputPath: string,
  compilation: webpack.compilation.Compilation): Chunkset {
  const names = new Map<string, number>();
  const chunkMapping = new Map<any, Chunk>();

  /** @type {Chunk[]} */
  const chunks = [];

  const sortedChunks = [
    ...(compilation.chunks as webpack.compilation.Chunk[])
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
