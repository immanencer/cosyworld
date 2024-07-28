import ollama from 'ollama';

const MODEL = 'llama3.1:8b-instruct-q3_K_M';

export async function generateContent(prompt, options = {}) {
  const response = await ollama.generate({ model: MODEL, prompt, options });
  return response.response.trim();
}
