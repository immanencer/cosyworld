import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import { setTimeout } from 'timers/promises';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'rnnDB';
const COLLECTION_NAME = 'tiny-rnn';

class TinyRNN {
  constructor(inputSize, hiddenSize, outputSize, learningRate = 0.1) {
    this.hSize = hiddenSize;
    this.lr = learningRate;
    this.Wxh = this.randMatrix(hiddenSize, inputSize);
    this.Whh = this.randMatrix(hiddenSize, hiddenSize);
    this.Why = this.randMatrix(outputSize, hiddenSize);
    this.bh = new Float64Array(hiddenSize);
    this.by = new Float64Array(outputSize);
  }

  randMatrix(rows, cols) {
    const size = rows * cols;
    const buffer = new ArrayBuffer(size * 8);
    const view = new DataView(buffer);
    crypto.randomFillSync(new Uint8Array(buffer));
    return new Float64Array(size).map((_, i) => view.getUint32(i * 8, true) / 0xffffffff - 0.5);
  }

  forward(x, h) {
    const newH = new Float64Array(this.hSize);
    for (let i = 0; i < this.hSize; i++) {
      newH[i] = Math.tanh(
        this.Wxh[i] * x +
        this.bh[i] +
        this.Whh.slice(i * this.hSize, (i + 1) * this.hSize).reduce((sum, w, j) => sum + w * h[j], 0)
      );
    }
    const y = new Float64Array(this.Why.length / this.hSize);
    for (let i = 0; i < y.length; i++) {
      y[i] = this.Why.slice(i * this.hSize, (i + 1) * this.hSize).reduce((sum, w, j) => sum + w * newH[j], 0) + this.by[i];
    }
    return { h: newH, y };
  }

  train(x, target) {
    const { h, y } = this.forward(x, new Float64Array(this.hSize));
    const dy = y.map((yi, i) => yi - target[i]);
    
    for (let i = 0; i < this.Why.length; i++) {
      this.Why[i] -= this.lr * dy[Math.floor(i / this.hSize)] * h[i % this.hSize];
    }
    this.by = this.by.map((bi, i) => bi - this.lr * dy[i]);
    
    const dh = new Float64Array(this.hSize);
    for (let i = 0; i < this.hSize; i++) {
      dh[i] = this.Why.reduce((sum, w, j) => sum + w * dy[Math.floor(j / this.hSize)], 0) * (1 - h[i] * h[i]);
      this.Wxh[i] -= this.lr * dh[i] * x;
      this.bh[i] -= this.lr * dh[i];
      for (let j = 0; j < this.hSize; j++) {
        this.Whh[i * this.hSize + j] -= this.lr * dh[i] * h[j];
      }
    }
  }

  generate(seed, length) {
    let h = new Float64Array(this.hSize);
    let x = new Float64Array(26);
    x[seed.toLowerCase().charCodeAt(0) - 97] = 1;
    let output = seed;

    for (let i = 0; i < length; i++) {
      const { h: newH, y } = this.forward(x, h);
      h = newH;
      const nextCharIndex = y.reduce((maxI, yi, i, arr) => yi > arr[maxI] ? i : maxI, 0);
      const nextChar = String.fromCharCode(nextCharIndex + 97);
      output += nextChar;
      x.fill(0);
      x[nextCharIndex] = 1;
    }

    return output;
  }

  toJSON() {
    return {
      hSize: this.hSize,
      lr: this.lr,
      Wxh: Array.from(this.Wxh),
      Whh: Array.from(this.Whh),
      Why: Array.from(this.Why),
      bh: Array.from(this.bh),
      by: Array.from(this.by)
    };
  }

  static fromJSON(json) {
    const rnn = new TinyRNN(26, json.hSize, 26, json.lr);
    rnn.Wxh = new Float64Array(json.Wxh);
    rnn.Whh = new Float64Array(json.Whh);
    rnn.Why = new Float64Array(json.Why);
    rnn.bh = new Float64Array(json.bh);
    rnn.by = new Float64Array(json.by);
    return rnn;
  }
}

async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  return client.db(DB_NAME).collection(COLLECTION_NAME);
}

async function saveRNN(rnn, taskId) {
  const collection = await connectToMongo();
  await collection.updateOne(
    { _id: taskId },
    { $set: { rnn: rnn.toJSON(), lastUpdated: new Date() } },
    { upsert: true }
  );
}

async function loadRNN(taskId) {
  const collection = await connectToMongo();
  const doc = await collection.findOne({ _id: taskId });
  return doc ? TinyRNN.fromJSON(doc.rnn) : new TinyRNN(26, 10, 26);
}

async function trainOnText(text, epochs, taskId, batchSize = 1000) {
  let rnn = await loadRNN(taskId);
  const totalIterations = epochs * (text.length - 1);
  let iteration = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < text.length - 1; i++) {
      const x = new Float64Array(26);
      x[text[i].toLowerCase().charCodeAt(0) - 97] = 1;
      const target = new Float64Array(26);
      target[text[i + 1].toLowerCase().charCodeAt(0) - 97] = 1;
      rnn.train(x, target);

      iteration++;
      if (iteration % batchSize === 0) {
        await saveRNN(rnn, taskId);
        await setTimeout(0); // Yield to event loop
        console.log(`Training progress: ${(iteration / totalIterations * 100).toFixed(2)}%`);
      }
    }
  }

  await saveRNN(rnn, taskId);
  console.log('Training completed');
}

async function scheduleTraining(text, epochs, taskId) {
  console.log(`Scheduling training task: ${taskId}`);
  setTimeout(() => trainOnText(text, epochs, taskId), 0);
}

async function generateText(seed, length, taskId) {
  const rnn = await loadRNN(taskId);
  return rnn.generate(seed, length);
}
