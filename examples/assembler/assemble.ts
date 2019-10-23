export enum ContentType {
  JS_SCRIPT,
}

export interface AssemblyOptions {
  chunkIds: number[];
  chunkNames: string[];
  contentType: ContentType;
  includeDeps: boolean;
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

function* collectParts(chunkset: Chunkset, options: AssemblyOptions): Generator<Part> {
  const {includeDeps} = options;
  const indices = options.chunkIds.concat(options.chunkNames.map(name => {
    return chunkset.names.get(name);
  }));

  const visited = new Set<number>();

  function* visitChunk(index: number) {
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

export function assemble(chunkset: Chunkset, options: AssemblyOptions): Uint8Array {
  const js: Uint8Array[] = [];


  for (const part of collectParts(chunkset, options)) {
    js.push(part.getBody());
  }

  return Buffer.concat(js);
}
