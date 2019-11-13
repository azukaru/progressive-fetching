process.on('disconnect', () => {
  process.exit();
});
if (process.connected !== true) {
  process.exit();
}

import path from 'path';

import parcel from '@parcel/core';
import ParcelPkg from '@parcel/package-manager';
import ParcelFS from '@parcel/fs';
import {fileURLToPath} from 'url';

const {NodePackageManager} = ParcelPkg;
const {NodeFS} = ParcelFS;

// @ts-ignore
const Bundler: typeof parcel = parcel.default || parcel;

interface ParcelConfigFile {}

interface BuildEvent {}

async function main() {
  const FILENAME = fileURLToPath(import.meta.url);
  // HACK: Parcel doesn't have a great way to statically determine what the
  //       entrypoints are supposed to be.
  const entries = path.resolve('app/page-*.js');
  const packageManager = new NodePackageManager(new NodeFS());
  let defaultConfig: ParcelConfigFile = await packageManager.require(
    '@parcel/config-default',
    FILENAME
  );

  const options = {
    entries,
    packageManager,
    defaultConfig: {
      ...defaultConfig,
      filePath: (await packageManager.resolve(
        '@parcel/config-default',
        FILENAME
      )).resolved
    },
    watch: true,
    autoInstall: false,
  };
  const bundler = new Bundler(options);

  process.send!({
    type: 'webl.builder.progress',
    progress: 0,
  });

  bundler.watch((error: Error | null, buildEvent: BuildEvent) => {
    process.send!({
      type: 'webl.builder.progress',
      progress: 1,
    });
    process.send!({
      type: 'webl.builder.done',
      success: !error,
      message: error?.message,
    });
  });
}
main().catch(e => process.nextTick(() => {throw e;}));
