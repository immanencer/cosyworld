require('dotenv').config();

module.exports = {
  apps: [
    { name: "whisper", script: "./agents/wolfpack/whisper.mjs" },
    { name: "shadow", script: "./agents/wolfpack/shadow.mjs" },
    { name: "skull", script: "./agents/wolfpack/skull.mjs" },
    { name: "codex", script: "./agents/wolfpack/codex.mjs" },
    { name: "nightmare", script: "./agents/wolfpack/nightmare.mjs" },
    { name: "ratichat", script: "./agents/ratichat.mjs" },
    { name: "steamclock", script: "./agents/steamclock.mjs" },
    { name: "ghost", script: "./agents/ghost.mjs" },
    { name: "librarian", script: "./agents/librarian.mjs" },
    { name: "mr-bear", script: "./agents/mr-bear.mjs" },
    { name: "bard", script: "./agents/bard/main.js" },
  ],
};
