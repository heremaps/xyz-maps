import {defineConfig} from 'vitest/config';
import {project} from './vitest/projects.mts';

// One project per component. Run a single one with e.g. `pnpm test --project editor`.
// `pnpm test --mode dev` runs against the dev bundles (dist/xyz-maps-<name>.js) instead of the minified ones.
// The integration tests need an XYZ Hub and run with `pnpm test:integration` (vitest.integration.config.mts).
export default defineConfig(({mode}) => ({
    test: {
        silent: 'passed-only',
        projects: [project('common', mode), project('core', mode), project('display', mode), project('editor', mode)],
        reporters: ['default', ['json', {outputFile: 'dist/vitest/report.json'}]]
    }
}));
