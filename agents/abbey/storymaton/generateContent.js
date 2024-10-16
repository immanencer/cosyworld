import ollama from 'ollama';

const MODEL = 'llama3.2:3b';

export async function generateContent(prompt, options = {}) {
  const response = await ollama.generate({ model: MODEL, prompt, options });
  return response.response.trim();
}
