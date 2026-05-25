// ESLint 9 flat config. Gevşek: amaç çalışmayı bozacak hataları yakalamak,
// stil Prettier'a bırakılmıştır. Mevcut JSX modülleri window globals
// kullandığı için browser env + bilinen global'ler eklenmiştir.

import js from '@eslint/js';
import globals from 'globals';

// jsx-a11y opsiyonel olarak yüklenir; paket kurulu değilse plugin atlanır.
let a11yPlugin = null;
try {
  // dinamik require ile flat-config içine al
  const mod = await import('eslint-plugin-jsx-a11y');
  a11yPlugin = mod.default || mod;
} catch (_e) {
  // kurulu değilse sessiz atla
}

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'server/node_modules/**',
      'server/uploads/**',
      'public/**',
      '**/*.min.js',
    ],
  },

  js.configs.recommended,

  // Frontend (browser + React, classic runtime → React global)
  {
    files: ['*.jsx', '**/*.jsx', 'main.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
        ReactDOM: 'readonly',
        Quill: 'readonly',
        DOMPurify: 'readonly',
      },
    },
    ...(a11yPlugin ? { plugins: { 'jsx-a11y': a11yPlugin } } : {}),
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-prototype-builtins': 'off',
      'no-undef': 'warn',
      'no-useless-escape': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-misleading-character-class': 'warn',
      // a11y — sadece uyarı seviyesinde, kademeli iyileştirme için
      ...(a11yPlugin
        ? {
            'jsx-a11y/alt-text': 'warn',
            'jsx-a11y/anchor-is-valid': 'warn',
            'jsx-a11y/no-autofocus': 'warn',
            'jsx-a11y/label-has-associated-control': 'warn',
            'jsx-a11y/click-events-have-key-events': 'off',
            'jsx-a11y/no-static-element-interactions': 'off',
          }
        : {}),
    },
  },

  // Server (Node + CommonJS)
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // CJS configs (postcss/tailwind/design-tokens)
  {
    files: ['*.cjs', 'postcss.config.cjs', 'design-tokens.cjs', 'tailwind.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  // ESM root configs (vite, eslint, vitest)
  {
    files: ['vite.config.js', 'eslint.config.js', 'vitest.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Test dosyaları
  {
    files: ['tests/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
  },
];
