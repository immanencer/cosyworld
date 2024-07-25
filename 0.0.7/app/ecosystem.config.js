{
    "apps": [
      {
        "name": "worker1",
        "script": "./worker1.js",
        "watch": true,
        "env_worker1": {
          "NODE_ENV": "worker1"
        }
      },
      {
        "name": "worker2",
        "script": "./worker2.js",
        "watch": true,
        "env_worker2": {
          "NODE_ENV": "worker2"
        }
      },
      {
        "name": "worker3",
        "script": "./worker3.js",
        "watch": true,
        "env_worker3": {
          "NODE_ENV": "worker3"
        }
      }
    ]
  }