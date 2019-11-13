declare module '@parcel/core' {
  export default class Bundler {
    constructor(options: any);

    on(event: 'buildStart' | 'buildEnd' | 'buildError', handler: Function): this;

    bundle(): void;
    watch(onError: Function): void;
  }
}

declare module '@parcel/package-manager' {
  class NodePackageManager {
    constructor(fs: any);

    require(specifier: string, base: string): any;
    resolve(specifier: string, base: string): {resolved: string};
  }

  interface DefaultExports {
    NodePackageManager: typeof NodePackageManager;
  }
  const DefaultExports: DefaultExports;
  export default DefaultExports;
}

declare module '@parcel/fs' {
  class NodeFS {
    constructor();
  }
  interface DefaultExports {
    NodeFS: typeof NodeFS;
  }
  const DefaultExports: DefaultExports;
  export default DefaultExports;
}
