import yaml from 'js-yaml';
import AIServiceManager from "../../tools/ai-service-manager.js"

const ai = new AIServiceManager();
await ai.useService('phi');
await ai.updateConfig({ system_prompt: `
you are a YAML expert, you interpret unstructured text and parse it to the correct valid YAML syntax

all blocks should return a valid YAML object with these keys:
from:
in:
message:

any additional keys should be ignored or included in an updated clean version of the message if appropriate
do not add missing keys, only include the keys that are present in the original text
` });

import { extractYAMLContent } from './yaml-extractor.js';

function extractDataFromYAML(yamlString) {
    try {
        const data = yaml.load(yamlString);
        return data;
    } catch (e) {
        console.error('💀 Failed to parse YAML:', e);
        return null;
    }
}

export async function cleanYAMLAI(input) {
    const results = [];
    if (!input) {
        console.log("⚠️ No input provided, returning empty array"); // Log if no input is provided
        return [];
    }
    const formattedYAML = await ai.chatSync({ role: 'user', content: input });
    const yamlBlocks = extractYAMLContent(formattedYAML);
    if (yamlBlocks.length === 0) {
        console.log("⚠️ No YAML blocks found, returning empty array"); // Log if no blocks are found
        return [];
    }

    yamlBlocks.forEach(block => {
        const data = extractDataFromYAML(block);
        results.push(data);
    });

    if (results.length === 0) {
        console.log("⚠️ No valid YAML blocks found, returning empty array"); // Log if no valid blocks are found
        return [];
    }
    return results;
}

export async function cleanYAML(input) {
    const results = [];
    if (!input) {
        console.log("⚠️ No input provided, returning empty array"); // Log if no input is provided
        return [];
    }
    const formattedYAML = input //(await ai.chatSync({ role: 'user', content: input }));
    const yamlBlocks = extractYAMLContent(formattedYAML);
    if (yamlBlocks.length === 0) {
        console.log("⚠️ No YAML blocks found, trying ai cleanup"); // Log if no blocks are found
        return (await cleanYAMLAI(input));
    }

    yamlBlocks.forEach(block => {
        const data = extractDataFromYAML(block);
        results.push(data);
    });

    if (results.length === 0) {
        console.log("⚠️ No valid YAML blocks found, trying ai cleanup"); // Log if no valid blocks are found
        return (await cleanYAMLAI(input));
    }
    return results;
}

