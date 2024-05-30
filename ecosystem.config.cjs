require('dotenv').config()
module.exports = {
  apps: [
    {
      "name": "server",
      "script": "./server/index.mjs"
    },
    {
      "name": "ai",
      "script": "./services/ai-processor.mjs"
    },
    {
      "name": "agents",
      "script": "./agents.mjs"
    },
    {
      "name": "listener",
      "script": "./services/listener.mjs"
    },
    {
      "name": "whisper",
      "script": "./agents/wolfpack/whisper.mjs"
    },
    {
      "name": "shadow",
      "script": "./agents/wolfpack/shadow.mjs"
    },
    {
      "name": "skull",
      "script": "./agents/wolfpack/skull.mjs"
    }, {
      "name": "ratichat",
      "script": "./agents/ratichat.mjs"
    }, {
      "name": "steamclock",
      "script": "./agents/steamclock.mjs"
    },
    {
      "name": "remy",
      "script": "./agents/remy.mjs"
    },
    {
      "name": "benny",
      "script": "./agents/benny.mjs"
    },
    {
      "name": "ghost",
      "script": "./agents/ghost.mjs"
    },
    {
      "name": "librarian",
      "script": "./agents/librarian.mjs"
    },
    {
      "name": "toad",
      "script": "./agents/toad.mjs"
    },
    {
      "name": "mr-bear",
      "script": "./agents/mr-bear.mjs"
    },
    {
      "name": "bard",
      "script": "./agents/bard.mjs"
    }
  ],
  restart_delay: 10000, // 10 seconds delay before restarting
  max_restarts: 3,
  min_uptime: 1000 * 60 * 60 // considered successfully started after an hour
}
