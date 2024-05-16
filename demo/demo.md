## Tutorial: Running the Interactive AI Chat Demo

This tutorial will walk you through setting up and running an interactive AI chat demo using our AI agent framework. The demo, encapsulated in `demo.js`, demonstrates initializing an AI service manager to interact with the "replicate" service.

### Prerequisites

Before starting, ensure you have:
- Node.js installed on your system.
- ollama: Pulled the necessary AI model.
- replicate: Configure your `replicate.json` with a valid API key.

### Step 1: Create the Demo File

First, create a file named `demo.js` in your project's root directory. You'll write a simple script that sets up a command-line interface for interacting with the AI configured to act like a "grumpy badger".

**Snippet from `demo.js`:**
```javascript
// Import the AI service manager
import AIServiceManager from './ai-service-manager.js';

// Initialize and configure the AI service
const manager = new AIServiceManager();
await manager.useService('replicate');
```

Refer to the complete code in the `demo.js` file in your main project directory.

### Step 2: Configure the AI Role

Set up a role-play prompt within the script to define the AI's character. This configuration influences how the AI will interact during the chat.

**Add this configuration in `demo.js`:**
```javascript
await manager.updateConfig({
    system_prompt: `you are a grumpy badger`
});
```

### Step 3: Set Up the Command-Line Interface

Use the `readline` module to create a simple command-line interface that will take user input and display AI responses.

**Snippet of setting up readline in `demo.js`:**
```javascript
import readline from 'readline';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
```

### Step 4: Implement the Chat Function

Implement a function to handle the interactive session, where the user can chat with the AI. This function will manage user input, AI responses, and maintain the chat flow.

**Brief code snippet from `demo.js`:**
```javascript
function chat() {
    rl.question('👤 > ', async (input) => {
        if (input.toLowerCase() === 'exit') {
            rl.close();
        } else {
            // Fetch and display the AI's response
            process.stdout.write('🦡 > ');
            const response = await manager.chat({role: "user", content: input});
            ...
        }
    });
}
```

### Step 5: Start the Chat Session

Finally, call the `chat` function to start the interactive session.

**In `demo.js`:**
```javascript
chat(); // Start the chat session
```

### Running the Demo

To run the demo, open your terminal, navigate to your project directory, and execute:
```bash
node ./demo.js
```
Follow the on-screen prompts to interact with the AI. Type `exit` to terminate the session.

### Conclusion

This demo illustrates basic integration and use of an AI service within our framework. You are encouraged to modify the `system_prompt` or integrate other services to explore the framework's capabilities further. Enjoy building and experimenting with different AI characters and responses!

You can find demo.js and the complete AI agent framework in the main project repository.Certainly! Below is a structured tutorial format that guides users through setting up and running the interactive AI chat application using `demo.js`. This approach keeps the code snippets brief for clarity and directs users to the main file for the full implementation.

---

## Tutorial: Running the Interactive AI Chat Demo

This tutorial will walk you through setting up and running an interactive AI chat demo using our AI agent framework. The demo, encapsulated in `demo.js`, demonstrates initializing an AI service manager to interact with the "replicate" service.

### Prerequisites

Before starting, ensure you have:
- Node.js installed on your system.
- ollama: Pulled the necessary AI model.
- replicate: Configure your `replicate.json` with a valid API key.

### Step 1: Create the Demo File

First, create a file named `demo.js` in your project's root directory. You'll write a simple script that sets up a command-line interface for interacting with the AI configured to act like a "grumpy badger".

**Snippet from `demo.js`:**
```javascript
// Import the AI service manager
import AIServiceManager from './ai-service-manager.js';

// Initialize and configure the AI service
const manager = new AIServiceManager();
await manager.useService('replicate');
```

Refer to the complete code in the `demo.js` file in your main project directory.

### Step 2: Configure the AI Role

Set up a role-play prompt within the script to define the AI's character. This configuration influences how the AI will interact during the chat.

**Add this configuration in `demo.js`:**
```javascript
await manager.updateConfig({
    system_prompt: `you are a grumpy badger`
});
```

### Step 3: Set Up the Command-Line Interface

Use the `readline` module to create a simple command-line interface that will take user input and display AI responses.

**Snippet of setting up readline in `demo.js`:**
```javascript
import readline from 'readline';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
```

### Step 4: Implement the Chat Function

Implement a function to handle the interactive session, where the user can chat with the AI. This function will manage user input, AI responses, and maintain the chat flow.

**Brief code snippet from `demo.js`:**
```javascript
function chat() {
    rl.question('👤 > ', async (input) => {
        if (input.toLowerCase() === 'exit') {
            rl.close();
        } else {
            // Fetch and display the AI's response
            process.stdout.write('🦡 > ');
            const response = await manager.chat({role: "user", content: input});
            ...
        }
    });
}
```

### Step 5: Start the Chat Session

Finally, call the `chat` function to start the interactive session.

**In `demo.js`:**
```javascript
chat(); // Start the chat session
```

### Running the Demo

To run the demo, open your terminal, navigate to your project directory, and execute:
```bash
node ./demo.js
```
Follow the on-screen prompts to interact with the AI. Type `exit` to terminate the session.

### Conclusion

This demo illustrates basic integration and use of an AI service within our framework. You are encouraged to modify the `system_prompt` or integrate other services to explore the framework's capabilities further. Enjoy building and experimenting with different AI characters and responses!

You can find demo.js and the complete AI agent framework in the main project repository.