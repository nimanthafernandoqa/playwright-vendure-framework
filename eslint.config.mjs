// @ts-check
//
// ESLint flat config. Run via `npm run lint` (or `npm run lint:fix`).
// Formatting itself is handled by Prettier (.prettierrc.json), not ESLint
// rules — eslintConfigPrettier below turns off any ESLint rule that would
// conflict with Prettier's formatting, so the two tools never fight.
//
// Note: package.json intentionally pins "typescript": "^6.0.3", not the
// newer 7.x — as of writing, typescript-eslint doesn't support TypeScript
// 7 yet (it refuses to run at all against it). Bump both together once
// typescript-eslint adds support.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.features-gen/**',
      // Timestamped backup dirs created when regenerating .features-gen/
      // locally (e.g. ".features-gen-old-<timestamp>/") — never committed,
      // but a broad prefix match here keeps local `npm run lint` clean too.
      '.features-gen-*/**',
      'playwright-report/**',
      'test-results/**',
      'dist/**',
      // Moved to the separate playwright-practice project.
      'interview-practice/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // Page Objects intentionally expose async methods without always
      // awaiting internally in every branch; keep this a warning, not an
      // error, while the suite is still growing.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
);
