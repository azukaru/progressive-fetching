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
import {promisify} from 'util';

import {assemble, Chunkset, ContentType} from 'asset-assembler';
import jsdom from 'jsdom';
import {Volume} from 'memfs';
import webpack from 'webpack';

import {DynamicBundlePlugin, buildChunksetFromCompilation} from './index';

class ChunksetResourceLoader extends jsdom.ResourceLoader {
  constructor(private chunkset: Chunkset) {
    super();
  }

  async fetch(url: string, options: any) {
    const staticPrefx = 'https://example.com/static/';
    if (url.startsWith(staticPrefx)) {
      const [chunkName, extension] = url.substr(staticPrefx.length).split('.');
      if (extension !== 'js') {
        return Promise.reject(new Error(`Unsupported batch type ${url}`));
      }
      return Buffer.from(assemble(this.chunkset, {
        chunkIds: [],
        chunkNames: [chunkName],
        includeDeps: true,
        contentType: extension as ContentType,
      }));
    }

    const dynamicPrefix = 'https://example.com/api/chunks/';
    if (url.startsWith(dynamicPrefix)) {
      const [idString, extension] = url.substr(dynamicPrefix.length).split('.');
      if (extension !== 'js') {
        return Promise.reject(new Error(`Unsupported batch type ${url}`));
      }
      const ids = idString.split(',').map(s => parseInt(s, 10));
      const options = {
        chunkIds: ids,
        chunkNames: [],
        includeDeps: false,
        contentType: extension as ContentType,
      };
      return Buffer.from(assemble(this.chunkset, options));
    }

    throw new Error(`Cannot fetch ${url}`);
  }
}

describe('DynamicBundlePlugin', () => {
  it('insert a batched import handler', async () => {
    const compiler = webpack({
      context: '/app',
      entry: {
        a: './a-src.js',
        b: './b-src.js',
      },
      output: {
        path: '/dist',
        filename: '[id]-[name].js',
        chunkFilename: '[id].js',
      },
      optimization: {
        splitChunks: {
          chunks: 'all',
          minSize: 1,
          maxInitialRequests: Infinity,
          maxAsyncRequests: Infinity,
        },
      },
      plugins: [
        new DynamicBundlePlugin(
          (prefix: string, ids: number[]) => {
            return `${prefix}/api/chunks/${ids.join(',')}.js`;
          }
        ),
      ],
    });
    const input = Volume.fromJSON({
      './a-src.js': `\
import "./shared-ab";

console.log("a");\n

Promise.all([import("./c-src"), import("./d-src")]).then(() => {
  console.log("a#post-import()");
  window.onCodeExecuted();
});
`,
      './b-src.js': 'import "./shared-ab";\nconsole.log("b");\n',
      './c-src.js': 'import "./shared-bc";\nconsole.log("c");\n',
      './d-src.js': 'console.log("d");\n',
      './shared-ab.js': 'console.log("shared-ab");\n',
      './shared-bc.js': 'console.log("shared-bc");\n',
    }, '/app');
    // @ts-ignore https://github.com/webpack/memory-fs/issues/67
    input.join = path.join;
    compiler.inputFileSystem = input as webpack.InputFileSystem;
    compiler.outputFileSystem = input as unknown as webpack.OutputFileSystem;

    const stats = await promisify(compiler.run.bind(compiler))();
    expect(stats.compilation.errors).toEqual([]);

    const chunkset = buildChunksetFromCompilation(
      compiler.inputFileSystem,
      compiler.outputPath,
      stats.compilation
    );

    const logs: string[] = [];
    const virtualConsole = new jsdom.VirtualConsole();
    virtualConsole.on('log', (message: string) => {
      logs.push(message);
    });

    const dom = new jsdom.JSDOM(
      `<!DOCTYPE html><script src="/static/a.js" id="entrypoint"></script>`,
      {
        url: 'https://example.com/some/page',
        runScripts: 'dangerously',
        resources: new ChunksetResourceLoader(chunkset),
        virtualConsole,
      }
    );
    await new Promise((resolve, reject) => {
      (dom.window as any).onCodeExecuted = resolve;
      dom.window.document.getElementById('entrypoint')!.addEventListener('error', (e: any) => {
        reject(e.error || new Error(e.message));
      });
      dom.window.onerror = reject;
    });

    expect(logs).toEqual([
      'shared-ab',
      'a',
      'shared-bc',
      'c',
      'd',
      'a#post-import()',
    ]);
  });
});
