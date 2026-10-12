import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/core/**/*.test.ts', 'src/core/**/*.spec.ts'],
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/core/**/*.ts'],
        exclude: [
          'src/core/**/*.test.ts',
          'src/core/**/*.spec.ts',
          'src/core/**/test-utils/**',
          'src/core/**/types.ts',
          'src/core/**/*types.ts',
          'src/core/**/*types.d.ts',
          'src/core/**/index.ts',
          'src/core/diagram/**',
        ],
        thresholds: {
          lines: 80,
          branches: 65,
        },
      },
    },
  })
);
