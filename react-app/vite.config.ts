import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');

  return {
    plugins: [
      react(),
      nodePolyfills({
        include: ['buffer', 'path'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    define: {
      'import.meta.env.CONTRACT_ADDRESS': JSON.stringify(env.CONTRACT_ADDRESS),
      'import.meta.env.DEPLOYER_ADDRESS': JSON.stringify(env.DEPLOYER_ADDRESS),
      'import.meta.env.DEPLOYMENT_SALT': JSON.stringify(env.DEPLOYMENT_SALT),
      'import.meta.env.AZTEC_NODE_URL': JSON.stringify(env.AZTEC_NODE_URL),
      global: 'globalThis',
    },
    resolve: {
      alias: {
        pino: 'pino/browser.js',
        'pino-pretty': 'pino-pretty/browser.js',
      },
    },
    optimizeDeps: {
      include: ['buffer', 'process', 'pino'],
      exclude: ['@aztec/noir-noirc_abi', '@aztec/noir-acvm_js', '@aztec/bb.js'],
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    assetsInclude: ['**/*.wasm'],
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      fs: {
        allow: ['..'],
      },
    },
  };
});
