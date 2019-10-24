import fs from 'fs';
import path from 'path';

import { assemble, ContentType } from '../../../assembler/assemble';

function loadJSON(...segments) {
  return JSON.parse(fs.readFileSync(path.resolve(...segments), 'utf8'));
}

/**
 * @returns {import('../../../assembler/assemble').Chunkset}
 */
function loadChunkset() {
  const buildId = fs.readFileSync(path.resolve('.next', 'BUILD_ID'), 'utf8');
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
            return fs.readFileSync(`.next/${filename}`);
          },
          dependsOn: [],
        },
      ],
    };
    chunks.push(chunk);
    return chunkId;
  }

  for (const [pageName, deps] of Object.entries(manifest.pages)) {
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

function parseChunkNames(chunkNames) {
  if (!chunkNames || typeof chunkNames !== 'string') {
    return [];
  }
  return chunkNames.split(',');
}

export default (req, res) => {
  const chunkset = loadChunkset();
  /** @type {import('../../../assembler/assemble').AssemblyOptions} */
  const options = {
    chunkIds: [],
    chunkNames: parseChunkNames(req.query.chunkNames),
    contentType: ContentType.JS_SCRIPT,
    includeDeps: true,
  };

  res.setHeader('Content-Type', 'text/javascript');

  res.end(assemble(chunkset, options));
};

export const config = {
  api: {
    bodyParser: false,
  },
};
