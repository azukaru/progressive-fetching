'use strict';
var ContentType;
(function (ContentType) {
    ContentType["JS_SCRIPT"] = "js";
    ContentType["JS_MODULE"] = "mjs";
    ContentType["STYLESHEET"] = "css";
})(ContentType || (ContentType = {}));
function* collectParts(chunkset, options) {
    const { includeDeps } = options;
    const indices = options.chunkIds.concat(options.chunkNames.map(name => {
        return chunkset.names.get(name);
    }));
    const visited = new Set();
    function* visitChunk(index) {
        if (visited.has(index))
            return;
        visited.add(index);
        const chunk = chunkset.chunks[index];
        const ownParts = [];
        for (const ownPart of chunk.parts) {
            ownParts.push(ownPart);
            if (!includeDeps)
                continue;
            for (const depIdx of ownPart.dependsOn) {
                yield* visitChunk(depIdx);
            }
        }
        yield* ownParts;
    }
    for (const index of indices) {
        yield* visitChunk(index);
    }
}
function concatArrays(arrays) {
    let size = 0;
    for (const array of arrays) {
        size += array.byteLength;
    }
    const out = new Uint8Array(size);
    let offset = 0;
    for (const array of arrays) {
        out.set(array, offset);
        offset += array.length;
    }
    return out;
}
export function assemble(chunkset, options) {
    const js = [];
    for (const part of collectParts(chunkset, options)) {
        js.push(part.getBody());
    }
    return concatArrays(js);
}
