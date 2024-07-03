import mongoose from 'mongoose';

const warriorSchema = new mongoose.Schema({
  text: String,
  epochs: Number,
  lives: { type: Number, default: 3 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
  status: { type: String, enum: ['training', 'ready'], default: 'training' },
  position: {
    x: Number,
    y: Number
  },
  rnn: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Warrior', warriorSchema);