# AI Agent Framework

This repository provides a straightforward framework for creating AI agents using Node.js. It aims to simplify the integration and management of multiple AI services within Node.js applications. By offering a standard interface to interact with different AI services, this framework assists in the seamless switching, testing, and deployment of various AI functionalities.

Currently, the framework supports the following AI services:

- [ollama](https://ollama.com/) (for local llms)
- [replicate](https://replicate.ai/) (for access to AI models)
- [openai](https://openai.com/) (for access to the assistants API)

## Getting Started

Run the app once to create the relevant config files in `./configurations`

### Installation

To use this framework with OLLAMA, first ensure you have downloaded the necessary AI model:

#### OLLAMA
```bash
ollama pull llama3
```

#### REPLICATE

You'll need a valid API key to use Replicate. You can obtain one by signing up at [Replicate.ai](https://replicate.ai/).

Run the app once and it will create a `./configurations/replicate.json` file. Add your API key to this file.

### Configuration

### Running the demo

```bash
node demo.js
```


### Running an Agent

To start the agent, use the provided script:

```bash
node agents/badger.js
```

### Running all the agents

Install pm2
    
    ```bash
    npm install pm2 -g
    ```

Start all the agents

    ```bash
    pm2 start ecosystem.config.js
    ```

## Setting Up the Discord Bot

⚠️ You will currently need to create all referenced channels and threads or modify the references in the code or it will crash.

To use the Discord bot functionality, you will need a valid token. Without this, the application will not be able to log in, resulting in the following error:

```plaintext
🎮 ❌ Error logging in: Error [TokenInvalid]: An invalid token was provided.
    at Client.login [...]
    code: 'TokenInvalid'
}
```

Ensure that your `.configurations/discord.json` file contains a valid Discord token and server ID:

```json
{
    "token": "YOUR_DISCORD_TOKEN" ,
    "guild": "YOUR_DISCORD_SERVER_ID"
}
```

## Troubleshooting

If you encounter an error stating that you have an invalid token, check that the `.configurations/discord.json` file is configured correctly with a valid token.

## Conclusion

This framework is currently tailored for use with OLLAMA. Adjustments or expansions to include additional AI services like Replicate may require further modifications to ensure compatibility.

# Acknowledgments

Created by Jonathan Beckwith for Cenetex Inc.

- [OpenAI](https://openai.com/)
- [OLLAMA](https://ollama.com/)
- [Replicate](https://replicate.ai/)
- [Node.js](https://nodejs.org/)
- [Discord.js](https://discord.js.org/)
- [MIT License](https://opensource.org/licenses/MIT)
```

# License

The code in this project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

cosyworld © 2024 by Jonathan Beckwith is licensed under CC BY 4.0. To view a copy of this license, visit https://creativecommons.org/licenses/by/4.0/

Licensing claims for external media (imgur links) are the responsibility of the original creators and are not covered by this statement.
