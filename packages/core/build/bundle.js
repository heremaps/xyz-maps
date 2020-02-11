import './shared';
import './MVTWorker';
import './index';

let XYZ_MAPS;

try {
    XYZ_MAPS = here.xyz.maps;
} catch (e) {
    XYZ_MAPS = {};
    window.here = {xyz: {maps: XYZ_MAPS}};
}

export default XYZ_MAPS;
