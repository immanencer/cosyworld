require('dotenv').config();

module.exports = {
  apps: [
    {
      name: "ai",
      script: "./services/ai-processor.mjs",
      env_file: ".env",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      cron_restart: "0 */6 * * *", // Restart every 6 hours
      error_file: "./logs/ai_err.log",
      out_file: "./logs/ai_out.log",
    },
    {
      name: "server",
      script: "./server/index.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_file: "./logs/server_err.log",
      out_file: "./logs/server_out.log",
    },
    {
      name: "listener",
      script: "./services/listener.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      cron_restart: "0 */1 * * *", // Restart every hour
      error_file: "./logs/listener_err.log",
      out_file: "./logs/listener_out.log",
    },
    {
      name: "agents",
      script: "./agent_manager/main.js",
      wait_ready: true,
      listen_timeout: 30000, // Longer timeout for agents
      kill_timeout: 10000,
      autorestart: false, // Disable auto-restart
      env: {
        STARTUP_DELAY: 30000, // 30 second delay
      },
      error_file: "./logs/agents_err.log",
      out_file: "./logs/agents_out.log",
    },
  ],
  restart_delay: 10000, // 10 seconds delay before restarting
  max_restarts: 3,
  min_uptime: 1000 * 60 * 5, // considered successfully started after 5 minutes
  error_file: "./logs/pm2_err.log",
  out_file: "./logs/pm2_out.log",
};
