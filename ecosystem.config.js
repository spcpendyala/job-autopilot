module.exports = {
  apps: [
    {
      name: 'job-autopilot-api',
      script: 'api/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'job-autopilot-cron',
      script: 'scripts/daily-scan.js',
      instances: 1,
      autorestart: false,
      watch: false,
      cron_restart: '0 8 * * *',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
