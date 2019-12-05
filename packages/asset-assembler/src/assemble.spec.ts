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
 * @fileoverview Uses the fixtures in `packages/example-chunksets` to verify
 * that running the asset assembler generates the expected output files.
 */

import path from 'path';
import fs from 'fs';

import {assemble, Chunkset, AssemblyOptions, ContentType} from './index';

function toUtf8(array: Uint8Array) {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(array);
}

describe('assemble', () => {
  it('assembles empty set and empty options to empty string', () => {
    const empty: Chunkset = {chunks: [], names: new Map()};
    const options: AssemblyOptions = {
      chunkIds: [],
      chunkNames: [],
      contentType: ContentType.JS_SCRIPT,
      includeDeps: true,
    };
    expect(toUtf8(assemble(empty, options))).toBe('');
    expect(assemble(empty, options)).toEqual(new Uint8Array(0));
    expect(Buffer.from(assemble(empty, options))).toEqual(Buffer.from(''));
  });

  const exampleSetsPath = path.join(__dirname, '../../example-chunksets');
  for (const exampleSetName of fs.readdirSync(exampleSetsPath)) {
    if (exampleSetName.includes('.')) continue;

    describe(exampleSetName, () => {
      const exampleSetPath = path.join(exampleSetsPath, exampleSetName);
      let exampleSet: Chunkset;

      beforeAll(() => {
        exampleSet = {
          chunks: [],
          names: new Map(),
        };
        const chunksPath = path.join(exampleSetPath, 'chunks');
        for (const chunkFile of fs.readdirSync(chunksPath)) {
          const chunkData = fs.readFileSync(path.join(chunksPath, chunkFile));
          const [, chunkId, chunkName] = chunkFile.match(/^(\d+)-([^.]+)\.(\w+)$/) ?? [];
          const id = parseInt(chunkId, 10);
          exampleSet.chunks[id] = {
            name: chunkName,
            parts: [
              {
                getBody() {
                  return chunkData;
                },
                dependsOn: [],
              },
            ],
          };
          exampleSet.names.set(chunkName, id);
        }
      });

      const exampleAssetsPath = path.join(exampleSetPath, 'assets');
      for (const exampleAssetName of fs.readdirSync(exampleAssetsPath)) {
        it(`produces ${exampleAssetName}`, () => {
          const testCase = fs.readFileSync(path.join(exampleAssetsPath, exampleAssetName), 'utf8');
          const newlineIdx = testCase.indexOf('\n');
          const options: AssemblyOptions = Object.assign(
            {
              chunkIds: [],
              chunkNames: [],
              contentType: path.extname(exampleAssetName).slice(1) as ContentType,
              includeDeps: true,
            },
            JSON.parse(testCase.slice(2, newlineIdx))
          );
          const output = testCase.slice(newlineIdx + 1);
          expect(toUtf8(assemble(exampleSet, options))).toBe(output);
        });
      }
    });
  }
});
