process.on('disconnect', () => {
  process.exit();
});
if (process.connected !== true) {
  process.exit();
}

import path from 'path';

import webpack from 'webpack';

async function main() {
  const {default: config} = await import(path.resolve('webpack.config.js'));

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
  }, (err /*, stats */) => {
    if (err) {
      process.send!({
        type: 'webl.builder.done',
        success: false,
        message: err.message,
      });
    } else {
      process.send!({
        type: 'webl.builder.done',
        success: true,
      });
    }
  });
  process.on('SIGTERM', () => {
    watcher.close(() => {
      process.exit();
    });
  });
}
main().catch(e => process.nextTick(() => {throw e;}));
