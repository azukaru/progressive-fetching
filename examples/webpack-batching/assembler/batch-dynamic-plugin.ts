import webpack from 'webpack';

const Template = require('webpack/lib/Template');

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

function getWebpack5JsonpHook(compilation) {
  const JsonpTemplatePlugin = require('webpack/lib/web/JsonpTemplatePlugin');
  return JsonpTemplatePlugin.getCompilationHooks(compilation).jsonpScript;
}

class BatchDynamicPlugin {
  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap(BatchDynamicPlugin.name, (compilation) => {
      let jsonpScriptHook = compilation.mainTemplate.hooks.jsonpScript;
      if (!jsonpScriptHook) {
        // webpack 5 removed this from the mainTemplate
        jsonpScriptHook = getWebpack5JsonpHook(compilation);
      }
      jsonpScriptHook.tap(BatchDynamicPlugin.name, (src, chunk, hash) => {
        const {
          crossOriginLoading,
          chunkLoadTimeout,
          jsonpScriptType
        } = compilation.outputOptions;

        const requireFn = '__webpack_require__';

        const scriptNonce = `${requireFn}.nc`;
        const activeBatch = `${requireFn}._ab`;
        const publicPath = `${requireFn}.p`;
        const getChunkScriptFilename = `${requireFn}.u`;

        return Template.asString([
          "var script;",
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
            "Promise.resolve().then(function () {",
            Template.indent([
              `${activeBatch} = null;`,
              `script.src = ${publicPath} + ${getChunkScriptFilename}(batch.map(c => c.id).join(','));`,
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

export default BatchDynamicPlugin;
