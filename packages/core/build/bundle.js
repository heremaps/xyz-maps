import './shared';
import './workers';
import './index';
let xyz = window;
'here.xyz.maps'.split('.').forEach((ns) => xyz = (xyz[ns] = xyz[ns] || {}));
export default xyz;
