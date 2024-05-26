import { parseYaml } from './parseYaml.js';

function testParseYaml() {
    const input = `
from: Alice
in: Lobby
message: Hello, world!

from: Bob
in: Kitchen
message: Where's the tea?
`;

    const expected = [
        { from: 'Alice', in: 'Lobby', message: 'Hello, world!' },
        { from: 'Bob', in: 'Kitchen', message: "Where's the tea?" }
    ];

    const output = parseYaml(input);
    console.log('Expected:', JSON.stringify(expected, null, 2));
    console.log('Received:', JSON.stringify(output, null, 2));
}

function testParseYaml2() {
    const input = `
from: Alice
in: Lobby
message: Hello, world!

from: Bob
in: Kitchen
message: Where's the tea?
`;

    const expected = [
        { from: 'Alice', in: 'Lobby', message: 'Hello, world!' },
        { from: 'Bob', in: 'Kitchen', message: "Where's the tea?" }
    ];

    const output = parseYaml(input);
    console.log(JSON.stringify(expected) === JSON.stringify(output, null, 2) ? '✅' : '💀');
}

testParseYaml();
