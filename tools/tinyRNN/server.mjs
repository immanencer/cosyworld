import express from 'express';
import cors from 'cors';
import apiRoutes from './api/routes.mjs';
import { initializeWorld } from './services/WorldGenerator.mjs';
import { startBattleLoop } from './services/BattleManager.mjs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

async function startServer() {
  try {
    await initializeWorld();
    await startBattleLoop();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();