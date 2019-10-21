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
    chunkFilename: 'chunk.[id].js',
    publicPath: '/assets/',
  },
  optimization: {
    runtimeChunk: {
      name: 'chunk.runtime',
    },
    splitChunks: {
      chunks: 'all',
      minSize: 0,
      name: false,
      cacheGroups: {
        default: false,
      },
    },
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'static'),
    before(app, server) {
      const {compiler} = server as unknown as {compiler: webpack.Compiler};

      const outputOptions = compiler.options.output;
      // We know that the FS supports both input and output methods.
      const outFS = compiler.outputFileSystem as unknown as webpack.InputFileSystem;

      app.use((req, res, next) => {
        if (req.url.startsWith(outputOptions.publicPath)) {
          const assetPath = req.url.slice(outputOptions.publicPath.length);
          // TODO: Actually check for entrypoints being requested directly
          const [, jsEntry] = assetPath.match(/^([\w-]+)\.js$/) || [];
          if (jsEntry) {
            // Assemble!
            // For now, let's use a static assembler. A super. Static. Assembler.
            const files = ['chunk.runtime', 'chunk.0', `chunk.${jsEntry}`];
            const output = [];
            for (const prefix of files) {
              const absoluteFile = path.resolve(outputOptions.path, `${prefix}.js`);
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
