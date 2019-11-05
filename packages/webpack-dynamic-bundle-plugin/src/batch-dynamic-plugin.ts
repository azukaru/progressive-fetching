import webpack from 'webpack';

const {Template} = webpack;

/**
 * Simulate the chunk loaded callback in webpack 4. Could be dropped if we don't
 * care about working with webpack 4. This function is stringified and will run
 * in the browser. `installedChunks` comes from the scope it gets inserted into.
 */
function loadingEnded4() {
  var returnValue = null;
  // @ts-ignore
  var chunk = installedChunks[chunkId];
  if (chunk !== 0) {
    if (chunk) {
      returnValue = chunk[1];
    }
    // @ts-ignore
    installedChunks[chunkId] = undefined;
  }
  return returnValue;
}

/**
 * In webpack 5, the hook moved from the mainTemplate to its own plugin.
 *
 * @param {webpack.compilation.Compilation} compilation
 */
function getWebpack5JsonpHook(compilation) {
  // @ts-ignore
  const {JsonpTemplatePlugin} = webpack.web;
  if (!JsonpTemplatePlugin) return null;
  return JsonpTemplatePlugin.getCompilationHooks(compilation).jsonpScript;
}

export default class DynamicBundlePlugin {
  constructor(private buildBatchEndpoint: (prefix: string, ids: number[]) => string) {
  }

  /**
   * @param {webpack.Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.compilation.tap(DynamicBundlePlugin.name, (compilation) => {
      let jsonpScriptHook = compilation.mainTemplate.hooks.jsonpScript;
      if (!jsonpScriptHook) {
        // webpack 5 removed this from the mainTemplate
        jsonpScriptHook = getWebpack5JsonpHook(compilation);
      }
      if (!jsonpScriptHook) {
        return;
      }
      jsonpScriptHook.tap(DynamicBundlePlugin.name, (src, chunk, hash) => {
        const {
          crossOriginLoading,
          chunkLoadTimeout,
          jsonpScriptType
        } = compilation.outputOptions;

        const requireFn = '__webpack_require__';

        const scriptNonce = `${requireFn}.nc`;
        const activeBatch = `${requireFn}._ab`;
        const publicPath = `${requireFn}.p`;

        return Template.asString([
          "var script;",
          // DIFF: We create a batch entry and then have an if/else to either
          // start a new batch or add it to an existing batch if one exists.
          `var batchEntry = { id: chunkId, done: typeof loadingEnded === 'function' ? loadingEnded : ${loadingEnded4} };`,
          `if (!${activeBatch}) {`,
          Template.indent([
            "script = document.createElement('script');",
            "var batch = [batchEntry]",
            `${activeBatch} = batch;`,
            jsonpScriptType
              ? `script.type = ${JSON.stringify(jsonpScriptType)};`
              : "",
            "script.charset = 'utf-8';",
            `script.timeout = ${chunkLoadTimeout / 1000};`,
            `if (${scriptNonce}) {`,
            Template.indent(
              `script.setAttribute("nonce", ${scriptNonce});`
            ),
            "}",
            // DIFF: This delays the actual fetch by a microtick. In the original
            // implementation of this hook, it's done immediately.
            "Promise.resolve().then(function () {",
            Template.indent([
              `${activeBatch} = null;`,
              // DIFF: In the original implementation, the script url is generated
              // earlier and this is just `script.src = url;`.
              `script.src = (${this.buildBatchEndpoint.toString()})(${publicPath}, batch.map(c => c.id));`,
              crossOriginLoading
                ? Template.asString([
                  "if (script.src.indexOf(window.location.origin + '/') !== 0) {",
                  Template.indent(
                    `script.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
                  ),
                  "}"
                ])
                : "",
              "// create error before stack unwound to get useful stacktrace later",
              "var error = new Error();",
              "onScriptComplete = function (event) {",
              Template.indent([
                "// avoid mem leaks in IE.",
                "script.onerror = script.onload = null;",
                "clearTimeout(timeout);",
                // DIFF: We have multiple chunks in the batch, so we have to iterate.
                // Originally (in webpack 5), the `loadingEnded` function replaces
                // `chunk.done()`. We capture those callbacks above.
                "for (var chunk of batch) {",
                Template.indent([
                  "var reportError = chunk.done();",
                  "if(reportError) {",
                  Template.indent([
                    "var errorType = event && (event.type === 'load' ? 'missing' : event.type);",
                    "var realSrc = event && event.target && event.target.src;",
                    "error.message = 'Loading chunk ' + chunk.id + ' failed.\\n(' + errorType + ': ' + realSrc + ')';",
                    "error.name = 'ChunkLoadError';",
                    "error.type = errorType;",
                    "error.request = realSrc;",
                    "reportError(error);"
                  ]),
                  "}",
                ]),
                "}"
              ]),
              "};",
              "var timeout = setTimeout(function(){",
              Template.indent([
                "onScriptComplete({ type: 'timeout', target: script });"
              ]),
              `}, ${chunkLoadTimeout});`,
              "script.onerror = script.onload = onScriptComplete;"
            ]),
            "});"
          ]),
          `} else {`,
          Template.indent([
            // DIFF: The surrounding code assumes that this code always generates
            // a local `script` variable that can be appended to the DOM. So even
            // when we're adding to a batch, we need to generate some kind of DOM
            // node. So we're adding comments. Also helps with debugging!
            "var onScriptComplete;",
            `${activeBatch}.push(batchEntry);`,
            "script = document.createComment(' Chunk ' + chunkId + ' queued ');",
          ]),
          `}`,
        ]);
      });
    });
  }
}
