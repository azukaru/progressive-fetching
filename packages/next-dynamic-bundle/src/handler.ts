import fs from 'fs';
import path from 'path';

import {assemble, AssemblyOptions, Chunkset, ContentType} from 'asset-assembler';

function loadJSON(...segments) {
  return JSON.parse(fs.readFileSync(path.resolve(...segments), 'utf8'));
}

function loadChunkset(): Chunkset {
  let buildId = 'development';
  try {
    buildId = fs.readFileSync(path.resolve('.next', 'BUILD_ID'), 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const manifest = loadJSON('.next', 'build-manifest.json');

  const chunks = [];
  const names = new Map();

  const filenameToChunkId = new Map();

  function getChunkIdForFilename(filename) {
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

  const chunkDir = path.resolve('.next', 'static', 'chunks');
  const numberedChunks = fs.readdirSync(chunkDir).filter(filename => filename.endsWith('.js'));
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

function parseChunkIds(chunkIds) {
  if (!chunkIds || typeof chunkIds !== 'string') {
    return [];
  }
  return chunkIds.split(',').map(id => parseInt(id, 10));
}

function parseChunkNames(chunkNames) {
  if (!chunkNames || typeof chunkNames !== 'string') {
    return [];
  }
  return chunkNames.split(',');
}

function parseAssemblyOptions(arg) {
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

export default (req, res) => {
  const chunkset = loadChunkset();
  const options: AssemblyOptions = parseAssemblyOptions(req.query.chunkIds);

  res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');

  const content = assemble(chunkset, options);

  res.write(`/** ${JSON.stringify(options)} */\n`);
  res.end(content);
};

export const config = {
  api: {
    bodyParser: false,
  },
};
