export default [
    {
        description: "Extracts single backtick-delimited YAML block",
        input: `
            \`\`\`yaml
            from: name
            to: location
            \`\`\`
        `,
        expected: ["from: name\nto: location"]
    },
    {
        description: "Extracts single dash-delimited YAML block",
        input: `
            ---
            from: name
            to: location
            ---
        `,
        expected: ["from: name\nto: location"]
    },
    {
        description: "Handles mixed content with non-YAML text",
        input: `
            Some random text
            ---
            from: name
            to: location
            ---
            More random text
            \`\`\`yaml
            message: hello
            \`\`\`
        `,
        expected: ["from: name\nto: location", "message: hello"]
    },
    {
        description: "Returns empty array for non-YAML content",
        input: "Just some random text without any YAML blocks.",
        expected: []
    },
    {
        description: "Extracts multiple YAML blocks of different types",
        input: `
            \`\`\`yaml
            message: hello
            \`\`\`
            ---
            from: name
            to: location
            ---
            Some intervening text
            ---
            another: block
            ---
        `,
        expected: ["message: hello", "from: name\nto: location", "another: block"]
    },
    {
        description: "Handles empty input gracefully",
        input: "",
        expected: []
    },
    {
        description: "YAML block without 'yaml' keyword",
        input: `
            ---
            from: John
            action: run
            ---
        `,
        expected: ["from: John\naction: run"]
    },
    {
        description: "Single YAML block without dividers",
        input: "name: John\ndate: today",
        expected: ["name: John\ndate: today"]
    },
    {
        description: "Multiple consecutive YAML blocks",
        input: `
            ---
            item: one
            ---
            ---
            item: two
            ---
        `,
        expected: ["item: one", "item: two"]
    },
    {
        description: "YAML with unusual whitespace",
        input: `
            ---
            name:   John
              age: 30
            ---
        `,
        expected: ["name:   John\n  age: 30"]
    },
    {
        description: "Deeply nested YAML structures",
        input: `
            ---
            root:
              child:
                grandchild: value
            ---
        `,
        expected: ["root:\n  child:\n    grandchild: value"]
    },
    {
        description: "YAML with embedded comments",
        input: `
            ---
            # This is a comment
            item: value # Another comment
            ---
        `,
        expected: ["# This is a comment\nitem: value # Another comment"]
    },
    {
        description: "YAML with quoted strings including delimiters",
        input: `
            ---
            sentence: "Hello, --- world!"
            ---
        `,
        expected: ['sentence: "Hello, --- world!"']
    }
];