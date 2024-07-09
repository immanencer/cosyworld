require('dotenv').config();

module.exports = {
  apps: [
    {
      name: "ai",
      script: "./services/ai-processor.mjs",
      envFile: ".env",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
    {
      name: "server",
      script: "./server/index.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      cron_restart: "*/30 * * * *", // Restart every 30 minutes
    },
    {
      name: "listener",
      script: "./services/listener.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
    {
      name: "agents",
      script: "./agent_manager/main.js",
      wait_ready: true,
      listen_timeout: 30000, // Longer timeout for agents
      kill_timeout: 10000,
      cron_restart: "0 */2 * * *", // Restart every 2 hours
      autorestart: false, // Disable auto-restart
      env: {
        STARTUP_DELAY: 30000, // 30 second delay
      },
    },
  ],
  restart_delay: 10000, // 10 seconds delay before restarting
  max_restarts: 3,
  min_uptime: 1000 * 60 * 60 // considered successfully started after an hour
};