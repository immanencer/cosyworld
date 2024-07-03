import express from 'express';
import { createWarrior, getWarriors, getWarrior, createRandomWarrior, moveWarrior, getWorld } from '../services/RNNRunner.mjs';
import { battle, getYoungestWarrior } from '../services/BattleManager.mjs';
import { exploreLocation } from '../services/WorldGenerator.mjs';

const router = express.Router();

router.post('/warriors', async (req, res) => {
  try {
    const { text, epochs } = req.body;
    const warrior = await createWarrior(text, epochs);
    res.json(warrior);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/warriors', async (req, res) => {
  try {
    const warriors = await getWarriors();
    res.json(warriors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/warriors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const warrior = await getWarrior(id);
    if (!warrior) {
      return res.status(404).json({ error: 'Warrior not found' });
    }
    res.json(warrior);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/warriors/random', async (req, res) => {
  try {
    const warrior = await createRandomWarrior();
    res.json(warrior);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/warriors/move', async (req, res) => {
  try {
    const { warriorId, direction } = req.body;
    const result = await moveWarrior(warriorId, direction);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/world', async (req, res) => {
  try {
    const world = await getWorld();
    res.json(world);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/world/:x/:y', (req, res) => {
  try {
    const { x, y } = req.params;
    const location = exploreLocation(parseInt(x), parseInt(y));
    res.json(location);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/youngest-warrior', async (req, res) => {
  try {
    const youngestWarrior = await getYoungestWarrior();
    res.json(youngestWarrior);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;