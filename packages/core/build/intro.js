// Inline-worker bootstrap for the two-pass build (CJS chunk factories).
// Keeps main and worker code in one bundle without duplicating the shared
// factory, which is reused to build the inline worker Blob at runtime.
function bootstrapCore(sharedFactory, workerFactory, mainFactory, sharedChunkId, common = here.xyz.maps.common) {
    const xyz = here.xyz.maps;
    const sharedExports = {};

    const mainRequire = (id) => {
        if (id === sharedChunkId) {
            return sharedExports;
        }
        if (id === '@here/xyz-maps-common') {
            return common;
        }
        throw new Error('Unknown main module: ' + id);
    };

    // Run the shared factory once for the main thread.
    sharedFactory(sharedExports, mainRequire);

    const chunkSource = (factory, name) =>
        `var ${name}={};(${factory})(${name},(id)=>{` +
        `if(id==="${sharedChunkId}")return s;` +
        `throw new Error("Unknown worker module: "+id);});`;

    xyz.__workerURL = URL.createObjectURL(new Blob([
        chunkSource(sharedFactory, 's') + chunkSource(workerFactory, 'w')
    ], {type: 'text/javascript'}));

    // Run the main factory with explicit shared and external-module resolution.
    mainFactory(xyz, mainRequire);
}
