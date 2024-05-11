module.exports ={
  apps : [{
    name   : "ratichat",
    script : "./agents/ratichat.js"
  },{
    name   : "badger",
    script : "./agents/badger.js"
  },{
    name   : "benny",
    script : "./agents/benny.js"
  },{
    name   : "toad",
    script : "./agents/toad.js"
  },{
    name   : "librarian",
    script : "./agents/librarian.js"
  },{
    name   : "remy",
    script : "./agents/remy.js"
  },{
    name   : "steamclock",
    script : "./agents/steamclock.js"
  },{
    name   : "ghost",
    script : "./agents/ghost.js"
  },{
    name: "mr-bear",
    script: "./agents/mr-bear.js"
  },{
    name: "skull",
    script: "./agents/wolves/skull.js"
  },{
    name: "shadow",
    script: "./agents/wolves/shadow.js"
  }],
  restart_delay: 10000, // 10 seconds delay before restarting
  max_restarts: 3,
  min_uptime: 25000 // considered successfully started after 5 seconds
}
