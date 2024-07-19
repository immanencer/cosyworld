require('dotenv').config();

module.exports = {
  apps: [
    {
      name: "ai",
      script: "./services/ai-processor.mjs",
      env_file: ".env",
      error_file: "./logs/ai_err.log",
      out_file: "./logs/ai_out.log",
    },
    {
      name: "server",
      script: "./server/index.mjs",
      error_file: "./logs/server_err.log",
      out_file: "./logs/server_out.log",
    },
    {
      name: "listener",
      script: "./services/listener.mjs",
      error_file: "./logs/listener_err.log",
      out_file: "./logs/listener_out.log",
    },
    {
      name: "agents",
      script: "./agent_manager/main.js",
      env: {
        STARTUP_DELAY: 30000, // 30 second delay
      },
      error_file: "./logs/agents_err.log",
      out_file: "./logs/agents_out.log",
    },
  ],
  error_file: "./logs/pm2_err.log",
  out_file: "./logs/pm2_out.log",
};
