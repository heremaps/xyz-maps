const fs = require('fs-extra');
const {join} = require('path');

fs.emptyDirSync('deploy');
fs.copySync('docs/', 'deploy/docs');
fs.copySync('packages/playground/dist', 'deploy/playground');
for (let module of ['common', 'core', 'display', 'editor']) {
    fs.copySync(join('packages', module, 'dist'), 'deploy');
}
