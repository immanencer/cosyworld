import fs from 'fs';
import crypto from 'crypto';
import OpenAI from 'openai';

const openai = new OpenAI();

// load the assistant by the id from filesystem
// create new assistants through the web interface if needed
console.log('🤖 Loading assistant...');
const assistant = fs.existsSync('assistant_id.txt')
  ? (await openai.beta.assistants.retrieve(fs.readFileSync('assistant_id.txt', 'utf8')))
  : (await openai.beta.assistants.create({ name: 'Persistent Chat Bot' }));
fs.writeFileSync('assistant_id.txt', assistant.id);

if (!assistant) throw new Error('Failed to load assistant');

// load the thread by the id from filesystem or create a new one
console.log('🧵 Loading thread...');
const thread = await (async (path) => fs.existsSync(path)
  ? (await openai.beta.threads.retrieve(fs.readFileSync(path, 'utf8')))
  : (await openai.beta.threads.create()))('thread_id.txt');
fs.writeFileSync('thread_id.txt', thread.id);


class MessageProcessor {
  constructor() {
    this.queue = [];
  }

  async completion({ model, prompt }) {
    const completion = await openai.chat.completions.create({
      messages: [{"role": "system", "content": "You are a cute newspaper editor in a redwall style woods. You summarize the goings on and events in the forest. You are a kind and gentle editor. You are a rat."},
          {"role": "user", "content": "What are the contents of today's newspaper?"}],
      model: "gpt-3.5-turbo",
    });
  
    console.log(completion.choices[0]);
    return completion.choices[0].message.content;
  }

  async createMessage(message) {
    console.log(`📩 Creating message: ${message.content}`);
    await openai.beta.threads.messages.create(thread.id, {
      role: message.role || 'user',
      content: message.content || message
    });
  }

  async enqueueMessage(message) {
    this.queue.push(message);
  }

  async run(post) {
    this.post = post;

    console.log(`Processing messages...`);

    try {
      if (fs.existsSync('run_id.txt')) {
        console.warn('🚨 Run ID file exists. Processing cancelled...');
        return;
      }

      // add all the messages in the queue
      while (this.queue.length > 0) {
        console.debug(`📩 Processing message: ${JSON.stringify(this.queue[0], null, 2)}`);
        await this.createMessage(this.queue.shift());
      }
      const stream2 = await openai.beta.threads.runs.stream(thread.id, {
        assistant_id: assistant.id
      }, {
        tool_choice: { type: "function", function: { name: "send_avatar_message" } }
      });
      for await (const event2 of stream2) {
        await this.handleStreamEvent(event2);
      }
    } catch (error) {
      console.error(`💀 Failed to process messages: ${error}`);
      throw error;
    }
  }

  async cancelAllRuns() {
    const runs = await openai.beta.threads.runs.list(this.threadId);
    console.log(JSON.stringify(Object.keys(runs)));

    for (let run of (await openai.beta.threads.runs.list(this.threadId)).data) {
      if (run.status === 'completed') continue;
      if (run.status === 'cancelled') continue;
      if (run.status === 'failed') continue;
      if (run.status === 'expired') continue;

      console.log(`⚠️ Cancelling ${run.id}`);
      await openai.beta.threads.runs.cancel(this.threadId, run.id);
    }

    if (fs.existsSync('run_id.txt')) {
      fs.rmSync('run_id.txt');
    }
  }

  async generate_tool_outputs(requiredAction) {
    const toolCalls = requiredAction.submit_tool_outputs.tool_calls;
    try {
      const tool_outputs = await Promise.all(toolCalls.map(async toolCall => {
        const parsedArguments = JSON.parse(toolCall.function.arguments);
        const output = await this[toolCall.function.name](parsedArguments);
        console.log(`🛠️ Tool output: ${output}`);
        return {
          tool_call_id: toolCall.id,
          output: output
        };
      }));
      return tool_outputs;
    } catch (error) {
      console.error("Error processing tool calls:", error);
      throw error;
    }
  }

  hash(message) {
    return crypto.createHash('sha256').update(JSON.stringify(message)).digest('hex').substring(0, 8)
  }

  output_message_cache = "";
  handled_events = new Set();
  async handleStreamEvent(event) {
    const hashed_event = this.hash(event);
    if (this.handled_events.has(hashed_event)) {
      //console.log(`🚨 Event already handled: ${hash}`);
      return;
    }
    this.handled_events.add(hashed_event);

    if (!fs.existsSync('run_id.txt')) {
      fs.writeFileSync('run_id.txt', event.data.id);
    }

    if (fs.existsSync('events')) {
      console.log(`Writing event to file: ${hashed_event}`);
      fs.writeFileSync(`events/${hashed_event}.json`, JSON.stringify(event, null, 2));
    }
    (event);

    if (event.event === 'thread.run.completed') {
      console.log(`📜 Run completed: ${event.data.id}`);
      fs.rmSync('run_id.txt');
    }

    if (!event.event) {
      console.log(`🚨 No event found: ${JSON.stringify(event)}`)
      return;
    }

    switch (event.event) {
      case 'thread.run.created':
        console.log(`📜 Run created: ${event.data.id}`)
        break;
      case 'thread.run.requires_action':
        console.log(`🚦 Requires action: ${event.data.required_action.type}`);

        let tool_outputs = [];
        try {
          tool_outputs = await this.generate_tool_outputs(event.data.required_action, event.data.thread_id, event.data.id);
        } catch (error) {
          console.error(`Failed to generate tool outputs: ${error}`);
          tool_outputs = [];
        }
        const stream = await openai.beta.threads.runs.submitToolOutputsStream(event.data.thread_id, event.data.id, {
          tool_outputs: tool_outputs
        });
        for await (const event of stream) {
          await this.handleStreamEvent(event);
        }
        break;
      case 'thread.run.completed':
        console.log(`📜 Run completed: ${event.data.id}`);
        break;
      case 'thread.message.created':
        console.log(`📩 Message created: ${event.data.id}`);
        break;
      case 'thread.message.in_progress':
        process.stdout.write(`${event.data.id} > `);
        break;
      case 'thread.message.delta':
        process.stdout.write(event.data.delta.content[0]?.text?.value);
        this.output_message_cache += event.data.delta.content[0]?.text?.value;
        if (this.output_message_cache && this.output_message_cache.endsWith('\n\n')) {
          this.post(this.output_message_cache);
          this.output_message_cache = '';
        }
        break;
      case 'thread.message.completed':
        if (this.message_cache) {
          this.post(this.output_message_cache);
          this.output_message_cache = '';
        }
        console.log(`\n📩 Message processing completed`);
        break;
      case 'thread.run.queued':
        console.log(`🕒 Run queued: ${event.data.message}`);
        break;
      case 'thread.run.started.in_progress':
        console.log(`🏃‍♀️ Run started: ${event.data.message}`);
        break;
      case 'thread.run.step.completed':
        if (this.output_message_cache) {
          this.post(this.output_message_cache);
          this.output_message_cache = '';
        }
        console.log(`📝 Step completed: ${event.data.id}`);
        break;
      case 'thread.run.step.delta':

        break;
      case 'thread.run.failed':
        console.log(`💥 Run failed: ${event.data.message}`);
        console.error(JSON.stringify(event, null, 2));
        // write the error to a file
        const data = JSON.stringify(event, null, 2);
        fs.writeFileSync(this.hash(data) + '.json', data);
        fs.rmSync('run_id.txt');

        break;
      default:
        console.log(`📡 Event received: ${event.event}`);
        break;
    }
  }
}

export default MessageProcessor;
