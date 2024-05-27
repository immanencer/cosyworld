import Replicate from 'replicate';
const replicate = new Replicate();

const input = {
    top_p: 1,
    prompt: "Can you write a poem about open source machine learning? Let's make it in the style of E. E. Cummings.",
    temperature: 0.5,
    system_prompt: "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible, while being safe. Your answers should not include any harmful, unethical, racist, sexist, toxic, dangerous, or illegal content. Please ensure that your responses are socially unbiased and positive in nature.\n\nIf a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.",
    max_new_tokens: 500
};

for await (const event of replicate.stream("meta/llama-2-70b-chat", { input })) {
  process.stdout.write(`${event}`)
};