import './shared';
import './workers';
import './index';
let xyz = typeof window =='undefined'?global:window; ;
'here.xyz.maps'.split('.').forEach((ns) => xyz = (xyz[ns] = xyz[ns] || {}));
export default xyz;
