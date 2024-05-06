import fs from 'fs/promises';

const CONFIGURATIONS_PATH = './.configurations';

export default async function configuration(component, config) {
    // Ensure the configuration directory exists.
    try {
        await fs.mkdir(CONFIGURATIONS_PATH, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error; // Rethrow if the error is not because the directory already exists.
        }
    }

    const configFilePath = `${CONFIGURATIONS_PATH}/${component}.json`;

    try {
        // Try to read the existing configuration file.
        return JSON.parse(await fs.readFile(configFilePath));
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If the file does not exist, create it with the provided configuration or an empty object.
            const initialConfig = JSON.stringify(config || {});
            await fs.writeFile(configFilePath, initialConfig);
            return JSON.parse(initialConfig);
        } else {
            // Rethrow if the error is due to some other issue.
            throw error;
        }
    }
}
