let shared;
let worker;

function define(_, chunk) {
    if (!shared) {
        shared = chunk;
    } else if (!worker) {
        worker = chunk || _;
    } else {
        const workerBundle = 'var shared={};(' + shared + ')(shared);(' + worker + ')(shared);';
        const sharedExports = {};
        shared(sharedExports);
        const xyzMaps = here.xyz.maps;
        xyzMaps.__workerURL = window.URL.createObjectURL(new Blob([workerBundle], {type: 'text/javascript'}));
        chunk(xyzMaps, xyzMaps.common, sharedExports);
    }
}
