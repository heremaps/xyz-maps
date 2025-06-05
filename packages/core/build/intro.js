let shared;
let worker;
function define(dep, factory) {
    if (!shared) {
        shared = factory;
    } else if (!worker) {
        worker = factory;
    } else {
        const xyz = here.xyz.maps;
        const sharedExports = {};
        shared(sharedExports);
        xyz.__workerURL = URL.createObjectURL(new Blob(['var shared={};('+shared+')(shared);('+worker+')(shared);'], {type: 'text/javascript'}));
        factory(xyz, sharedExports, xyz.common);
    }
}
