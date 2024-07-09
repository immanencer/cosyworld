require('dotenv').config();

module.exports = {
  apps: [
    {
      name: "whisper",
      script: "./agents/wolfpack/whisper.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 0,
      },
    },
    {
      name: "shadow",
      script: "./agents/wolfpack/shadow.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 5000, // 5 seconds delay
      },
    },
    {
      name: "skull",
      script: "./agents/wolfpack/skull.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 10000, // 10 seconds delay
      },
    },
    {
      name: "ratichat",
      script: "./agents/ratichat.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 15000, // 15 seconds delay
      },
    },
    {
      name: "steamclock",
      script: "./agents/steamclock.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 20000, // 20 seconds delay
      },
    },
    {
      name: "ghost",
      script: "./agents/ghost.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 25000, // 25 seconds delay
      },
    },
    {
      name: "librarian",
      script: "./agents/librarian.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 30000, // 30 seconds delay
      },
    },
    {
      name: "mr-bear",
      script: "./agents/mr-bear.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 35000, // 35 seconds delay
      },
    },
    {
      name: "bard",
      script: "./agents/bard.mjs",
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        STARTUP_DELAY: 40000, // 40 seconds delay
      },
    },
  ],
  restart_delay: 10000, // 10 seconds delay before restarting
  max_restarts: 3,
  min_uptime: 1000 * 60 * 60 // considered successfully started after an hour
};