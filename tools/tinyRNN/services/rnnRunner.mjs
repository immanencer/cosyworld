import { TinyRNN } from '../models/TinyRNN.mjs';
import Warrior from '../models/Warrior.mjs';
import { exploreLocation } from './WorldGenerator.mjs';

const WORLD_SIZE = 100;

export async function createWarrior(text, epochs) {
  const rnn = new TinyRNN(26, 10, 26);
  const warrior = new Warrior({
    text,
    epochs,
    position: {
      x: Math.floor(Math.random() * WORLD_SIZE),
      y: Math.floor(Math.random() * WORLD_SIZE)
    }
  });

  await warrior.save();
  trainWarrior(warrior._id, text, epochs, rnn);
  return warrior;
}

export async function createRandomWarrior() {
  const text = Math.random().toString(36).substring(7);
  const epochs = Math.floor(Math.random() * 2000) + 500;
  return createWarrior(text, epochs);
}

export async function getWarriors() {
  return Warrior.find({});
}

export async function getWarrior(id) {
  return Warrior.findById(id);
}

export async function moveWarrior(warriorId, direction) {
  const warrior = await Warrior.findById(warriorId);
  if (!warrior) throw new Error('Warrior not found');

  let newX = warrior.position.x;
  let newY = warrior.position.y;

  switch(direction) {
    case 'north': newY = Math.max(0, newY - 1); break;
    case 'south': newY = Math.min(WORLD_SIZE - 1, newY + 1); break;
    case 'west': newX = Math.max(0, newX - 1); break;
    case 'east': newX = Math.min(WORLD_SIZE - 1, newX + 1); break;
    default: throw new Error('Invalid direction');
  }

  warrior.position = { x: newX, y: newY };
  await warrior.save();

  const location = exploreLocation(newX, newY);
  return { newPosition: { x: newX, y: newY }, location };
}

async function trainWarrior(warriorId, text, epochs, rnn) {
  const totalIterations = epochs * (text.length - 1);
  
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < text.length - 1; i++) {
      const x = new Float64Array(26);
      x[text[i].toLowerCase().charCodeAt(0) - 97] = 1;
      const target = new Float64Array(26);
      target[text[i + 1].toLowerCase().charCodeAt(0) - 97] = 1;
      
      rnn.train(x, target);
      
      const progress = ((epoch * text.length + i + 1) / totalIterations) * 100;
      await Warrior.findByIdAndUpdate(warriorId, { 
        progress, 
        status: progress === 100 ? 'ready' : 'training' 
      });
    }
  }
  
  const compressedRNN = rnn.toCompressedJSON();
  await Warrior.findByIdAndUpdate(warriorId, { rnn: compressedRNN, status: 'ready' });
}

export async function generateText(warriorId, seed, length) {
  const warrior = await Warrior.findById(warriorId);
  if (!warrior || !warrior.rnn) {
    throw new Error('Warrior not found or not trained');
  }
  
  const rnn = TinyRNN.fromCompressedJSON(warrior.rnn);
  return rnn.generate(seed, length);
}