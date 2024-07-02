module.exports ={
  apps : [
    {   "name": "ai",
        "script": "./services/ai-processor.mjs"
    },
    {   "name": "agents",
        "script": "./agent_manager/main.js"
    },
    {   "name": "server",
        "script": "./server/index.mjs"
    },
    {   "name": "listener",
        "script": "./services/listener.mjs"
    }],
  restart_delay: 10000, // 10 seconds delay before restarting
  max_restarts: 3,
  min_uptime: 1000 * 60 * 60 // considered successfully started after an hour
}
