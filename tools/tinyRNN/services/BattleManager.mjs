import Warrior from '../models/Warrior.mjs';
import { generateText } from './RNNRunner.mjs';

const BATTLE_INTERVAL = 10000; // 10 seconds

export async function startBattleLoop() {
  setInterval(async () => {
    try {
      const warriors = await Warrior.find({ status: 'ready', lives: { $gt: 0 } });
      if (warriors.length < 2) return;

      const [warrior1, warrior2] = getRandomWarriors(warriors, 2);
      await battle(warrior1._id, warrior2._id);
    } catch (error) {
      console.error('Error in battle loop:', error);
    }
  }, BATTLE_INTERVAL);
}

export async function battle(warrior1Id, warrior2Id) {
  const [warrior1, warrior2] = await Promise.all([
    Warrior.findById(warrior1Id),
    Warrior.findById(warrior2Id)
  ]);

  if (!warrior1 || !warrior2) {
    throw new Error('One or both warriors not found');
  }

  const seed = Math.random().toString(36).substring(7);
  const length = 50;

  const [text1, text2] = await Promise.all([
    generateText(warrior1._id, seed, length),
    generateText(warrior2._id, seed, length)
  ]);

  const score1 = evaluateText(text1);
  const score2 = evaluateText(text2);

  const winner = score1 > score2 ? warrior1 : warrior2;
  const loser = score1 > score2 ? warrior2 : warrior1;

  winner.wins += 1;
  loser.losses += 1;
  loser.lives -= 1;

  await Promise.all([winner.save(), loser.save()]);

  return {
    text1,
    text2,
    winner: winner._id,
    loser: loser._id
  };
}

function evaluateText(text) {
  // Simple evaluation function. You might want to implement a more sophisticated one.
  return text.length;
}

function getRandomWarriors(warriors, count) {
  const shuffled = warriors.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export async function getYoungestWarrior() {
  return Warrior.findOne({ lives: { $gt: 0 } }).sort('-createdAt');
}