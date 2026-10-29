import {defineConfig} from 'vitest/config';
import {project} from './vitest/projects.mts';

// Integration tests talk to an XYZ Hub. They need environments.json and credentials.json (see README.md).
export default defineConfig({
    test: {
        projects: [project('integration')],
        reporters: ['default', ['json', {outputFile: 'dist/vitest/report-integration.json'}]]
    }
});
