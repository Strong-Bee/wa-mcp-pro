import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', 'tests', '**/*.d.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@whatsapp': path.resolve(__dirname, './src/whatsapp'),
      '@mcp': path.resolve(__dirname, './src/mcp'),
      '@api': path.resolve(__dirname, './src/api'),
      '@automation': path.resolve(__dirname, './src/automation'),
      '@database': path.resolve(__dirname, './src/database'),
      '@security': path.resolve(__dirname, './src/security'),
      '@monitoring': path.resolve(__dirname, './src/monitoring'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
});