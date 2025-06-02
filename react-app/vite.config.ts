import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');

  return {
    plugins: [react()],
    define: {
      'import.meta.env.CONTRACT_ADDRESS': JSON.stringify(env.CONTRACT_ADDRESS),
      'import.meta.env.DEPLOYER_ADDRESS': JSON.stringify(env.DEPLOYER_ADDRESS),
      'import.meta.env.DEPLOYMENT_SALT': JSON.stringify(env.DEPLOYMENT_SALT),
      'import.meta.env.AZTEC_NODE_URL': JSON.stringify(env.AZTEC_NODE_URL),
    },
  };
});
