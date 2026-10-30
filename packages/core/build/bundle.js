// The embedded AMD loader uses Common without exposing that dependency to Rollup.
import '@here/xyz-maps-common';
import './shared';
import './workers';
import './index';
let xyz = typeof window =='undefined'?global:window; ;
'here.xyz.maps'.split('.').forEach((ns) => xyz = (xyz[ns] = xyz[ns] || {}));
export default xyz;
