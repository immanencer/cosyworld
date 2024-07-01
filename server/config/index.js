// config/index.js
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  PROCESS_INTERVAL: parseInt(process.env.PROCESS_INTERVAL, 10) || 500,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};