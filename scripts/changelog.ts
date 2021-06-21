const {join} = require('path');
const {readFileSync, writeFileSync} = require('fs');
const changelog = require('@here/xyz-changelog');

const XYZ_MAPS_SRC = '../';

const {version} = require(join(__dirname, XYZ_MAPS_SRC, 'package.json'));

const isPreRelease = () => {
    let tag = version.match(/-(.+)/i);
    return tag ? tag[1].replace(/\d/g, '') : null;
};

const packages = ['common', 'core', 'display', 'editor'];

(async () => {
    try {
        let updates = await changelog.getMarkup({path: join(__dirname, XYZ_MAPS_SRC) + '/'});
        console.log('!');
        if (updates) {
            console.log(updates);

            const file = join(__dirname, XYZ_MAPS_SRC, 'CHANGELOG.MD');
            const changelog = readFileSync(file, 'utf8');

            for (let pkg of packages) {
                writeFileSync(join(__dirname, XYZ_MAPS_SRC, 'packages', pkg, 'CHANGELOG.MD'), updates + changelog, 'utf8');
            }
            // in case of prerelease do not save changelog in root...
            // ...to make sure next final release won't include prerelease nodes.
            if (!isPreRelease()) {
                writeFileSync(file, updates + changelog, 'utf8');
            }
        }
    } catch (e) {
        console.error(e);
    }
})();
// lerna run --scope @here/xyz-maps-playground build -- --environment BUILD:production --environment api-path:../ --environment doc-path:../documentation/

