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
