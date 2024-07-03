import zlib from 'zlib';
import crypto from 'crypto';

export class TinyRNN {
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

    for (let i = 0; i <= length; i++) {
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
      Wxh: Array.from(this.Wxh),
      Whh: Array.from(this.Whh),
      Why: Array.from(this.Why),
      bh: Array.from(this.bh),
      by: Array.from(this.by),
    };
  }

  toCompressedJSON() {
    const jsonString = JSON.stringify(this.toJSON());
    return zlib.gzipSync(jsonString).toString('base64');
  }
}

///Test

class Model {
  constructor() {
    this.Wxh = new Float32Array(10).map(() => Math.random()); // Example data
    this.Whh = new Float32Array(10).map(() => Math.random()); // Example data
    this.Why = new Float32Array(10).map(() => Math.random()); // Example data
    this.bh = new Float32Array(10).map(() => Math.random()); // Example data
    this.by = new Float32Array(10).map(() => Math.random()); // Example data
  }

  toJSON() {
    return {
      Wxh: Array.from(this.Wxh),
      Whh: Array.from(this.Whh),
      Why: Array.from(this.Why),
      bh: Array.from(this.bh),
      by: Array.from(this.by),
    };
  }

  toCompressedJSON() {
    const jsonString = JSON.stringify(this.toJSON());
    return zlib.gzipSync(jsonString).toString('base64');
  }
}

// Example usage:
const model = new Model();
const compressedJson = model.toCompressedJSON();
console.log('Compressed JSON:', compressedJson);

// To decompress:
import { Buffer } from 'buffer';

const decompressedJsonString = zlib.gunzipSync(Buffer.from(compressedJson, 'base64')).toString();
const decompressedJson = JSON.parse(decompressedJsonString);
console.log('Decompressed JSON:', decompressedJson);

// Test to verify correctness:
const originalJson = model.toJSON();
const isEqual = JSON.stringify(originalJson) === JSON.stringify(decompressedJson);
console.log('Test passed:', isEqual);
