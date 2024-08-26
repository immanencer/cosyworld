import ollama from 'ollama';

const MODEL = 'mannix/llama3.1-8b-abliterated:tools-q4_0';

export async function generateContent(prompt, options = {}) {
  const response = await ollama.generate({ model: MODEL, prompt, options });
  return response.response.trim();
}
