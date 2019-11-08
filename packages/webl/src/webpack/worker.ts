process.on('disconnect', () => {
  process.exit();
});
if (process.connected !== true) {
  process.exit();
}

import path from 'path';

import webpack from 'webpack';

const config = require(path.resolve('webpack.config'));

const compiler = webpack(config);

new webpack.ProgressPlugin((progress: number, message: string, moduleProgress?: string, activeModules?: string, moduleName?: string) => {
  process.send!({
    type: 'webl.builder.progress',
    progress,
    message,
  });
}).apply(compiler);

const watcher = compiler.watch({
  poll: false,
}, (err, stats) => {
  console.log('build completed', !!err, !!stats);
});

setTimeout(() => {
  watcher.close(() => {
    process.exit();
  });
}, 10000);
