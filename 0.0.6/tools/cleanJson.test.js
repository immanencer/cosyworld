import { runTests } from "./testRunner.js";

import cleanJson from "./cleanJson.js";

// Assume cleanJson is imported or defined above this block

async function testCleanJson() {
    const tests = [
        {
            description: 'Unescaped quotes inside string values',
            input: '{"name":"John "Doe"}',
            expected: '{"name":"John \\"Doe\\""}'
        },
        {
            description: 'Missing quotes on keys',
            input: '{name:"John"}',
            expected: '{"name":"John"}'
        },
        {
            description: 'Single quotes used instead of double',
            input: "{'name':'John'}",
            expected: '{"name":"John"}'
        },
        {
            description: 'Correct JSON should remain unchanged',
            input: '{"name": "John", "age": 30}',
            expected: '{"name": "John", "age": 30}'
        },
        {
            description: 'Nested JSON with errors',
            input: '{user: {name:"John", "age":30, "children": [{name:"Jane \'Doe\'}]}}',
            expected: `{"user": {"name":"John", "age":30, "children": [{"name":"Jane \\\'Doe\\"}]}}`
        }
    ];

    await runTests(cleanJson, tests);
}

testCleanJson();
