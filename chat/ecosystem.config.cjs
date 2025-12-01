module.exports = {
  apps: [
    {
      name: 'tupperware-webhook:3007',
      script: './tupperware-webhook/index.cjs',
      watch: true, // Reinicia automaticamente se um arquivo for alterado
      ignore_watch: ['node_modules', 'tupperware-webhook/db.json'],
      max_memory_restart: '100M',
      env: {
        NODE_ENV: 'development',
        PORT: '3007',
        APP_PORT: '3007'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3007',
        APP_PORT: '3007'
      },
    },
  ],
};
