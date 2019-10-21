import path from 'path';

import webpack from 'webpack';

const config: webpack.Configuration = {
  context: __dirname,
  entry: {
    'page-a': './app/page-a.js',
    'page-b': './app/page-b.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    chunkFilename: 'chunk.[name].js',
    publicPath: '/assets/',
  },
  optimization: {
    runtimeChunk: {
      name: 'chunk.runtime',
    },
    splitChunks: {
      chunks: 'all',
      minSize: 1,
      maxAsyncRequests: 100000,
      maxInitialRequests: 100000,
      name: true,
      cacheGroups: {
        vendors: false,
      },
    },
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'static'),
    after(app, server) {
      const {compiler} = server as unknown as {compiler: webpack.Compiler};

      const entryChunks = new Map();
      compiler.hooks.emit.tap('DevServer', compilation => {
        entryChunks.clear();
        for (const [name, entrypoint] of compilation.entrypoints) {
          const files = [].concat(...entrypoint.chunks.map(c => c.files));
          entryChunks.set(name, files);
        }
      });

      const outputOptions = compiler.options.output;
      // We know that the FS supports both input and output methods.
      const outFS = compiler.outputFileSystem as unknown as webpack.InputFileSystem;

      app.use((req, res, next) => {
        if (req.url.startsWith(outputOptions.publicPath)) {
          const assetPath = req.url.slice(outputOptions.publicPath.length);

          const jsEntryName = assetPath.endsWith('.js') ? assetPath.slice(0, -3) : null;
          if (jsEntryName !== null && entryChunks.has(jsEntryName)) {
            const output = [];
            for (const filename of entryChunks.get(jsEntryName)) {
              output.push(Buffer.from(`\n/* File: ${filename} */\n`));
              const absoluteFile = path.resolve(outputOptions.path, filename);
              const fileContents = outFS.readFileSync(absoluteFile);
              output.push(fileContents);
            }
            const assetBody = Buffer.concat(output);
            // TODO: Properly send the content
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.send(assetBody);
            return;
          }
        }
        next();
      });
    },
  },
};

export default config;
