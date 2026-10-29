import {defineConfig} from 'vitest/config';
import {project} from './vitest/projects.mts';

// One project per component. Run a single one with e.g. `pnpm test --project editor`.
// The integration tests need an XYZ Hub and run with `pnpm test:integration` (vitest.integration.config.mts).
export default defineConfig({
    test: {
        projects: [project('common'), project('core'), project('display'), project('editor')],
        reporters: ['default', ['json', {outputFile: 'dist/vitest/report.json'}]]
    }
});
