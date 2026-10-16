module.exports = {
  apps: [{
    name: 'mis-backend',
    script: './server.js',
    instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
    exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Restart the app if it crashes
    restart_delay: 4000,
    // Maximum number of restarts
    max_restarts: 10,
    // Minimum uptime before considering the app as stable
    min_uptime: '10s'
  }]
};
