import assert from 'assert';
import { TinyRNN } from './rnn.mjs';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'rnnTestDB';
const COLLECTION_NAME = 'tiny-rnn-test';

async function runTests() {
  console.log('Running tests...');
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    await testRNNCreation();
    await testRNNTraining();
    await testRNNGeneration();
    await testMongoDBIntegration(collection);
    await testAPIEndpoints();

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    if (client) await client.close();
  }
}

async function testRNNCreation() {
  const rnn = new TinyRNN(26, 10, 26);
  assert(rnn instanceof TinyRNN, 'RNN should be instance of TinyRNN');
  assert(rnn.hSize === 10, 'Hidden size should be 10');
  console.log('RNN creation test passed');
}

async function testRNNTraining() {
  const rnn = new TinyRNN(26, 10, 26);
  const initialState = rnn.toJSON();
  
  const x = new Float64Array(26);
  x[0] = 1;
  const target = new Float64Array(26);
  target[1] = 1;
  
  rnn.train(x, target);
  
  const trainedState = rnn.toJSON();
  assert(JSON.stringify(initialState) !== JSON.stringify(trainedState), 'RNN state should change after training');
  console.log('RNN training test passed');
}

async function testRNNGeneration() {
  const rnn = new TinyRNN(26, 10, 26);
  const generated = rnn.generate('a', 5);
  assert(generated.length === 5, 'Generated text should have length 5');
  assert(generated[0] === 'a', 'Generated text should start with seed');
  console.log('RNN generation test passed');
}

async function testMongoDBIntegration(collection) {
  const rnn = new TinyRNN(26, 10, 26);
  const taskId = 'test-task';
  
  await collection.updateOne(
    { _id: taskId },
    { $set: { rnn: rnn.toJSON(), lastUpdated: new Date() } },
    { upsert: true }
  );
  
  const savedDoc = await collection.findOne({ _id: taskId });
  assert(savedDoc, 'Document should be saved in MongoDB');
  assert(savedDoc.rnn, 'Saved document should contain RNN data');
  
  const loadedRNN = TinyRNN.fromJSON(savedDoc.rnn);
  assert(loadedRNN instanceof TinyRNN, 'Loaded RNN should be instance of TinyRNN');
  
  console.log('MongoDB integration test passed');
}

async function testAPIEndpoints() {
  const baseUrl = 'http://localhost:3000/api';
  
  // Test create project
  const createResponse = await fetch(`${baseUrl}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'test', epochs: 10 })
  });
  const createResult = await createResponse.json();
  assert(createResult.hexName, 'Create project should return hexName');
  assert(createResult.emoji, 'Create project should return emoji');
  
  // Test get projects
  const projectsResponse = await fetch(`${baseUrl}/projects`);
  const projects = await projectsResponse.json();
  assert(Array.isArray(projects), 'Get projects should return an array');
  
  // Test generate text
  const generateResponse = await fetch(`${baseUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hexName: createResult.hexName, seed: 'a', length: 5 })
  });
  const generateResult = await generateResponse.json();
  assert(generateResult.generated, 'Generate text should return generated text');
  assert(generateResult.generated.length === 5, 'Generated text should have correct length');
  
  console.log('API endpoints test passed');
}

await runTests();