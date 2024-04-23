# AI Agent Framework

This repository provides a straightforward framework for creating AI agents using Node.js. It aims to simplify the integration and management of multiple AI services within Node.js applications. By offering a standard interface to interact with different AI services, this framework assists in the seamless switching, testing, and deployment of various AI functionalities.

Currently, the framework supports **OLLAMA** exclusively. The integration with other platforms like Replicate may have issues due to recent changes.

## Getting Started

### Installation

To use this framework with OLLAMA, first ensure you have downloaded the necessary AI model:

```bash
ollama pull llama3
```

### Running the Agent

To start the agent, use the provided script:

```bash
node agents/badger.js
```

## Setting Up the Discord Bot

To use the Discord bot functionality, you will need a valid token. Without this, the application will not be able to log in, resulting in the following error:

```plaintext
🎮 ❌ Error logging in: Error [TokenInvalid]: An invalid token was provided.
    at Client.login [...]
    code: 'TokenInvalid'
}
```

Ensure that your `.configurations/discord-bot.json` file contains a valid Discord token and server ID:

```json
{
    "token": "YOUR_DISCORD_TOKEN" ,
    "guild": "YOUR_DISCORD_SERVER_ID"
}
```

## Troubleshooting

If you encounter an error stating that you have an invalid token, check that the `.configurations/discord-bot.json` file is configured correctly with a valid token.

## Conclusion

This framework is currently tailored for use with OLLAMA. Adjustments or expansions to include additional AI services like Replicate may require further modifications to ensure compatibility.


# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

# Acknowledgments

Created by Jonathan Beckwith for Cenetex Inc.

- [OpenAI](https://openai.com/)
- [OLLAMA](https://ollama.com/)
- [Replicate](https://replicate.ai/)
- [Node.js](https://nodejs.org/)
- [Discord.js](https://discord.js.org/)
- [MIT License](https://opensource.org/licenses/MIT)
```
