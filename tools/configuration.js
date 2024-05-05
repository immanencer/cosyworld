import fs from 'fs';

const CONFIGURATIONS_PATH = './.configurations';

if (!fs.existsSync(CONFIGURATIONS_PATH)) {
    fs.mkdirSync(CONFIGURATIONS_PATH);
}

export default function configuration(component, config) {
    if (!fs.existsSync(`${CONFIGURATIONS_PATH}/${component}.json`)) {
        fs.writeFileSync(`${CONFIGURATIONS_PATH}/${component}.json`,JSON.stringify(config||{}));
    }
    return JSON.parse(fs.readFileSync(`${CONFIGURATIONS_PATH}/${component}.json`));   
} 