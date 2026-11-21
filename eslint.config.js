/**
 * @file   eslint.config.js
 * @brief  ESLint flat config: strict typed TypeScript rules, size limits and layer rules.
 *
 * Responsibility: enforce the size and structure rules of CLAUDE.md (file ≤ 300 lines, tests
 *                 ≤ 400, function ≤ 60, complexity ≤ 12, no default exports), the layer rule
 *                 domain ← application ← apps/server (eslint-plugin-boundaries) and the ban on
 *                 Math.random outside tests (CONCEPT §8). Formatting is left to Prettier.
 *                 After the pattern of seasonal-mini-games eslint.config.js.
 * Depends on:     tsconfig.json of the root and of every workspace project (typed linting),
 *                 tsconfig.base.json (the "@sc/*" aliases)
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import boundariesModule from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

// The package types declare an ESM default export, but the package is CommonJS and its
// module.exports is the plugin itself, so the default import already is the plugin.
const boundaries = /** @type {import('eslint').ESLint.Plugin} */ (
  /** @type {unknown} */ (boundariesModule)
);

// One boundaries element per workspace project.
const ELEMENTS = [
  { type: 'contracts', pattern: 'packages/contracts' },
  { type: 'domain', pattern: 'packages/domain' },
  { type: 'application', pattern: 'packages/application' },
  { type: 'ui', pattern: 'packages/ui' },
  { type: 'server', pattern: 'apps/server' },
  { type: 'web', pattern: 'apps/web' },
];

/**
 * Which element may import which (CLAUDE.md "Architecture rules"). Anything not listed is
 * disallowed: contracts import no workspace project; the domain only the wire shapes; the client
 * side (ui, web) never reaches domain or application, so it cannot compute a result.
 * @param {string} from
 * @param {string[]} to
 */
const allow = (from, to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: { anyOf: to } } } },
});
const LAYER_POLICIES = [
  allow('domain', ['contracts']),
  allow('application', ['domain', 'contracts']),
  allow('ui', ['contracts']),
  allow('server', ['domain', 'application', 'contracts']),
  allow('web', ['contracts', 'ui']),
];

// Default exports are banned so every import names what it uses.
const NO_DEFAULT_EXPORT = [
  { selector: 'ExportDefaultDeclaration', message: 'Use a named export.' },
  { selector: 'ExportSpecifier[exported.name="default"]', message: 'Use a named export.' },
];

export default defineConfig(
  // Build and test output, and the git-ignored local folder of runs and data.
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/coverage/',
      '.local/',
      'test-results/',
      'playwright-report/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': ELEMENTS,
      // The resolver only needs the aliases, which live in the base config.
      'import/resolver': { typescript: { project: 'tsconfig.base.json' } },
    },
    rules: {
      'no-restricted-syntax': ['error', ...NO_DEFAULT_EXPORT],
      'max-lines': ['error', { max: 300 }],
      'max-lines-per-function': ['error', { max: 60 }],
      complexity: ['error', 12],
      'max-params': ['error', 4],
      // Underscore-prefix is the TS convention for a deliberately unused parameter.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'boundaries/dependencies': ['error', { default: 'disallow', policies: LAYER_POLICIES }],
      // Fairness (CONCEPT §8): randomness comes from an injected port, never Math.random.
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use an injected random port.' },
      ],
    },
  },
  {
    // Test files of every kind, the Playwright specs included, may run to 400 lines and may
    // use Math.random for fuzz inputs.
    files: ['**/*.test.ts', '**/*.test.tsx', 'e2e/**/*.spec.ts'],
    rules: {
      'max-lines': ['error', { max: 400 }],
      'max-lines-per-function': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    // Tool config files must default-export their configuration (Vite, Vitest, Playwright).
    files: ['*.config.js', '*.config.ts', '**/*.config.js', '**/*.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
