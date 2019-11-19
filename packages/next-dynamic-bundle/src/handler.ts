// Need to use require so it works with the node file tracer
const fs = require('fs');
const path = require('path');

import {assemble, AssemblyOptions, Chunkset, ContentType, Chunk} from 'asset-assembler';
import {ServerResponse} from 'http';

function loadChunkset(): Chunkset {
  const chunkDir = path.resolve('.next', 'static', 'chunks');
  let buildId = 'development';
  try {
    buildId = fs.readFileSync(path.resolve('.next/BUILD_ID'), 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const manifest = JSON.parse(fs.readFileSync(path.resolve('.next/build-manifest.json'), 'utf8'));

  // stat directories we need to preserve, for node file tracing purposes
  fs.statSync(path.resolve(`.next/static/${buildId}/pages`));
  fs.statSync(chunkDir);

  const chunks: Chunk[] = [];
  const names = new Map();

  const filenameToChunkId = new Map();

  function getChunkIdForFilename(filename: string) {
    if (filenameToChunkId.has(filename)) {
      return filenameToChunkId.get(filename);
    }
    const chunkId = chunks.length;
    filenameToChunkId.set(filename, chunkId);
    const chunk = {
      parts: [
        {
          key: -1,
          getBody() {
            return Buffer.concat([
              fs.readFileSync(`.next/${filename}`),
              Buffer.from('\n'),
            ]);
          },
          dependsOn: [],
        },
      ],
    };
    chunks.push(chunk);
    return chunkId;
  }

  const numberedChunks: string[] = fs.readdirSync(chunkDir).filter((filename: string) => filename.endsWith('.js'));
  numberedChunks.sort((a, b) => {
    return parseInt(a.substr(0, a.indexOf('.')), 10) - parseInt(b.substr(0, b.indexOf('.')), 10);
  });
  // TODO: Handle situations where it's not a gap-less integer sequence
  for (const numberedChunk of numberedChunks) {
    getChunkIdForFilename(`static/chunks/${numberedChunk}`);
  }

  // TODO: Handle local dev where the manifest may be missing pages..?
  for (const [pageName, deps] of Object.entries(manifest.pages) as [string, string[]][]) {
    const filename = `static/${buildId}/pages/${pageName}.js`;
    const chunkId = getChunkIdForFilename(filename);
    names.set(pageName.replace(/^\//, ''), chunkId);

    const pageChunk = chunks[chunkId];

    for (const depFilename of deps) {
      const depId = getChunkIdForFilename(depFilename);
      pageChunk.parts[0].dependsOn.push(depId);
    }
  }

  return {
    names,
    chunks,
  };
}

function parseChunkIds(chunkIds: string) {
  if (!chunkIds || typeof chunkIds !== 'string') {
    return [];
  }
  return chunkIds.split(',').map(id => parseInt(id, 10));
}

function parseChunkNames(chunkNames: string) {
  if (!chunkNames || typeof chunkNames !== 'string') {
    return [];
  }
  return chunkNames.split(',');
}

function parseAssemblyOptions(arg: string) {
  const options: AssemblyOptions = {
    chunkIds: [],
    chunkNames: [],
    contentType: ContentType.JS_SCRIPT,
    includeDeps: true,
  };

  const [key, value] = arg.split('=');
  switch (key) {
    case 'i':
      options.chunkIds.push(...parseChunkIds(value));
      break;

    case 'n':
      options.chunkNames.push(...parseChunkNames(value));
      break;

    default:
      throw new Error(`Unknown param type ${key}`);
  }

  return options;
}

export default (req: any, res: ServerResponse) => {
  if (req.query.chunkIds.endsWith('.js.map')) {
    res.setHeader('Content-Type', 'application/json');
    res.end(Buffer.from('{}'));
    return;
  }
  const chunkset = loadChunkset();
  const options: AssemblyOptions = parseAssemblyOptions(req.query.chunkIds);

  res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');

  const content = assemble(chunkset, options);

  res.write(`/** ${JSON.stringify(options)} */\n`);
  res.end(Buffer.from(content));
};

export const config = {
  api: {
    bodyParser: false,
  },
};
