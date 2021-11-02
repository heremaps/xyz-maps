import {global} from '@here/xyz-maps-common';
import './shared';
import './MVTWorker';
import './index';

let XYZ = global;
'here.xyz.maps'.split('.').forEach((ns) => XYZ = (XYZ[ns] = XYZ[ns] || {}));
export default XYZ;
