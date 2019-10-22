export enum ContentType {
  JS_SCRIPT,
}

export interface AssemblyOptions {
  chunkIds: number[];
  chunkNames: string[];
  contentType: ContentType;
};

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

function* collectParts(chunkset: Chunkset, indices: number[]): Generator<Part> {
  const visited = new Set<number>();

  function* visitChunk(index: number) {
    if (visited.has(index)) return;
    visited.add(index);

    const chunk = chunkset.chunks[index];

    const ownParts = [];

    for (const ownPart of chunk.parts) {
      for (const depIdx of ownPart.dependsOn) {
        yield* visitChunk(depIdx);
      }
      ownParts.push(ownPart);
    }

    yield* ownParts;
  }

  for (const index of indices) {
    yield* visitChunk(index);
  }
}

export function assemble(chunkset: Chunkset, options: AssemblyOptions): Uint8Array {
  const js: Uint8Array[] = [];

  const chunkIds = options.chunkIds.concat(options.chunkNames.map(name => {
    return chunkset.names.get(name);
  }));

  for (const part of collectParts(chunkset, chunkIds)) {
    js.push(part.getBody());
  }

  return Buffer.concat(js);
}
