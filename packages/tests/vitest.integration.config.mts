import {defineConfig} from 'vitest/config';
import {project} from './vitest/projects.mts';

// Integration tests talk to an XYZ Hub. They need environments.json and credentials.json (see README.md).
// `--mode dev` runs against the dev bundles, like in vitest.config.mts.
export default defineConfig(({mode}) => ({
    test: {
        silent: 'passed-only',
        projects: [project('integration', mode)],
        reporters: ['default', ['json', {outputFile: 'dist/vitest/report-integration.json'}]]
    }
}));
