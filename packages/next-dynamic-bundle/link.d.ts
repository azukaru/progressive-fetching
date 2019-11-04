declare module 'asset-assembler' {
  export enum ContentType {
    JS_SCRIPT = "js",
    JS_MODULE = "mjs",
    STYLESHEET = "css"
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
  export function assemble(chunkset: Chunkset, options: AssemblyOptions): Uint8Array;
}

declare module 'webpack-dynamic-bundle-plugin' {
  import webpack from 'webpack';
  import {Chunkset} from 'asset-assembler';

  export function buildChunksetFromCompilation(fs: webpack.InputFileSystem, outputPath: string, compilation: webpack.compilation.Compilation): Chunkset;

  export class DynamicBundlePlugin {
    private buildBatchEndpoint;
    constructor(buildBatchEndpoint: (prefix: string, ids: number[]) => string);
    /**
     * @param {webpack.Compiler} compiler
     */
    apply(compiler: any): void;
  }
}
