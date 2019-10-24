import fs from 'fs';
import path from 'path';

function loadJSON(...segments) {
  return JSON.parse(fs.readFileSync(path.resolve(...segments), 'utf8'));
}

export default (req, res) => {
  // Unfortunately records maps names to chunk ids. Which isn't something we can
  // actually use for the most part.
  // const records = loadJSON('.next', 'records.json');

  const buildId = fs.readFileSync(path.resolve('.next', 'BUILD_ID'), 'utf8');

  const manifest = loadJSON('.next', 'build-manifest.json');
  const files = new Set(
      ['_app', 'robin']
        .map(pageId => {
          return `static/${buildId}/pages/${pageId}.js`;
        })
        .concat(manifest.pages['/robin'])
        .concat(manifest.pages['/_app'])
  );

  res.setHeader('Content-Type', 'text/javascript');

  for (const filename of files) {
    const contents = fs.readFileSync(`.next/${filename}`);
    res.write(`/* Chunk File: ${filename} */\n`);
    res.write(contents);
    res.write('\n');
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};
