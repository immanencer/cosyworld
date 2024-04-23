# ServiceManager Framework

The `ServiceManager` framework is designed to facilitate the integration and management of multiple AI services in Node.js applications. It provides a standardized way to interact with different AI services, making it easier to switch, test, and deploy various AI functionalities. The included `demo.js` serves as a demonstration of how the `ServiceManager` can be used to build a simple console chat interface.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 12 or later recommended)
- npm (typically comes with Node.js)

## Installation

Follow these steps to set up the project locally:

1. Clone the Repository


2. Install Dependencies
   ```bash
   npm install


3. Set environment variables for the Replicate API token
  in Bash

    ```bash
    export REPLICATE_API_TOKEN="{YOUR_TOKEN}"
    ```

or in PowerShell

    ```bash
    $env:REPLICATE_API_TOKEN="{YOUR_TOKEN}"
    ```

3. Run the demo script to see the `ServiceManager` in action:
   ```bash
   node demo.js
   ```

## Configuration

To utilize the `ServiceManager` effectively, you need to configure the AI services it will manage:
- Edit the `ServiceManager.js` file to include or exclude services.
- Ensure each service module is properly configured in the `services` directory.

## Usage

### Using the ServiceManager

The `ServiceManager` is designed to be flexible and can be incorporated into various parts of your application. Here’s a basic example of how to initialize and use the `ServiceManager`:

```javascript
const ServiceManager = require('./ServiceManager');
const manager = new ServiceManager();

async function main() {
    try {
        const response = await manager.chat('What is your name?');
        console.log('Response:', response);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
```

### Running the Demo

To see the `ServiceManager` in action, run the chat interface demo:
```bash
node demo.js
```

This script demonstrates how the `ServiceManager` handles real-time chat interactions through the command line.

## Features

- **Modular Service Management**: Easily add or remove AI services by configuring the `ServiceManager`.
- **Standardized API**: Uniform API across different AI services to streamline interactions.
- **Demo Interface**: `demo.js` provides a real-world example of using the `ServiceManager` in a chat application.

## Contributing

We welcome contributions to improve the `ServiceManager` and its implementations. To contribute:

1. Fork the repository.
2. Create a new branch for your features (`git checkout -b feature-branch`).
3. Commit your changes.
4. Push to the branch and open a pull request.

## Troubleshooting

If you encounter issues with specific services or configurations:
- Verify the configuration files in the `config` directory.
- Check the service modules in the `services` directory for errors or misconfigurations.
- Ensure that all dependencies are correctly installed by running `npm install`.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE) file for details.