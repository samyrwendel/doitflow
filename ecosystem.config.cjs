module.exports = {
  apps: [
    {
      name: 'demo-backend:3004',
      script: './server.cjs',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      cwd: '/home/ia-demo-idx/htdocs/demo.idx.ia.br',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/demo-backend-error.log',
      out_file: './logs/demo-backend-out.log',
      log_file: './logs/demo-backend-combined.log'
    }
  ]
};