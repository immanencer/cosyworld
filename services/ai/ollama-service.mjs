import ollama from 'ollama';
import crypto from 'crypto';
import process from 'process';

class OllamaService {
  static #modelCache = new Set();

  constructor(model = process.env.DEFAULT_OLLAMA_MODEL || 'llama3.2:1b') {
    this.model = model;
  }

  async chatCompletion(params) {
    const {
      systemPrompt,
      messages,
      modelOverride,
      temperature = 1.0,
      maxTokens = 8192,
      signal,
      tools
    } = params;

    const modelToUse = modelOverride || this.model;
    const modelHash = this.#generateHash(`FROM ${modelToUse}\nSYSTEM "${systemPrompt}"`);

    await this.#ensureModelExists(modelHash, modelToUse, systemPrompt, signal);

    const formattedMessages = this.#formatMessages(systemPrompt, messages);

    try {

      const options = {
        model: modelHash,
        messages: formattedMessages,
        options: {
          temperature,
          num_predict: maxTokens,
        },
        stream: false,
        tools
      };
      if (tools) {
        options.tools = tools;
      }
      const result = await ollama.chat(options);

      if (!result.message) {
        throw new Error('Empty or invalid response from Ollama');
      }

      // Handle tool calls if present
      if (result.message.tool_calls) {
        return {
          content: result.message.content,
          tool_calls: result.message.tool_calls
        };
      }

      return result.message.content;
    } catch (error) {
      console.error('Failed to get response from Ollama:', error);
      throw new Error('Failed to get response from Ollama');
    }
  }


  #formatMessages(systemPrompt, messages) {
    return [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => {
        if (typeof msg === 'string') {
          return { role: 'user', content: msg };
        }
        return msg;
      })
    ];
  }

  async #ensureModelExists(modelHash, baseModel, systemPrompt, signal) {
    if (!OllamaService.#modelCache.has(modelHash)) {
      try {
        await ollama.create({
          model: modelHash,
          modelfile: `FROM ${baseModel}\nSYSTEM "${systemPrompt}"`,
          signal
        });
        console.log('Model created:', baseModel, modelHash);
        OllamaService.#modelCache.add(modelHash);
      } catch (error) {
        console.error('Failed to create model:', error);
        throw new Error('Failed to create Ollama model');
      }
    }
  }

  #generateHash(input) {
    return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
  }

  static clearModelCache() {
    OllamaService.#modelCache.clear();
    console.log('Model cache cleared');
  }

  static async listAvailableModels() {
    try {
      const models = await ollama.list();
      return models.models.map(model => model.name);
    } catch (error) {
      console.error('Failed to list available models:', error);
      throw new Error('Failed to list available Ollama models');
    }
  }
}

export default OllamaService;