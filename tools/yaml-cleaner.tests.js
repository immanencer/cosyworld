export default [{
    input: `
    ---
    from: name
    in: location
    message:
    a single
    or multiple line message
    ---
    `,
    expected: [{
        from: 'name',
        in: 'location',
        message: "a single\nor multiple line message"
    }]
},
{
    input: `
    ---
    from: anotherName
    in: anotherLocation
    message:
    - part one
    - part two: 
      nested: yes
    ---
    `,
    expected: [{
        from: 'anotherName',
        in: 'anotherLocation',
        message: [
            'part one',
            { 'part two': { nested: 'yes' } }
        ]
    }]
},
{
    input: `
        ---
        from: "Incomplete message
        `,
    expected: [{ from: "Incomplete message" }],  // Expecting an error or empty output due to malformed YAML
    description: "Malformed YAML without proper ending"
},
{
    input: `
        ---
        from: "name"
        in: "location"
        message: "Normal single line"
        ---
        ---
        from: anotherName
        in: anotherLocation
        message:
          - part one
          - part two: 
            deeply: 
              nested: "Very complex structure"
        ---
        `,
    expected: [
        {
            from: "name",
            in: "location",
            message: "Normal single line"
        },
        {
            from: "anotherName",
            in: "anotherLocation",
            message: [
                "part one",
                {
                    "part two": {
                        "deeply": {
                            "nested": "Very complex structure"
                        }
                    }
                }
            ]
        }
    ],
    description: "Multiple blocks, including deeply nested structures"
},
{
    input: ``,  // Empty input
    expected: [],
    description: "Empty input should handle gracefully"
},
{
    input: `
        ---
        from: name with special characters !@#$%^&*()
        in: "location with: colon and 'quotes'"
        message: "Message with escaped characters: \\"test\\""
        ---
        `,
    expected: [
        {
            from: "name with special characters !@#$%^&*()",
            in: "location with: colon and 'quotes'",
            message: 'Message with escaped characters: "test"'
        }
    ],
    description: "YAML with special characters and escaped sequences"
},
{
    input: `
        ---
        from: "Only a header"
        ---
        `,
    expected: [
        {
            from: "Only a header"
        }
    ],
    description: "YAML with missing keys"
},
{
    input: `
        ---
        from: >
          This is a folded
          style message where
          new lines become spaces
        ---
        `,
    expected: [
        {
            from: "This is a folded style message where new lines become spaces"
        }
    ],
    description: "Folded style multi-line string"
}, {
    input: `
        ---
        from: Rati 🐭
        in: 🏡 cody cottage
        message: A tale for you, dear friends... of starlight and moonbeams, of whispers in the wind...
        ---
        `,
    expected: [{
        from: "Rati 🐭",
        in: "🏡 cody cottage",
        message: "A tale for you, dear friends... of starlight and moonbeams, of whispers in the wind..."
    }],
    description: "Well-formed YAML should be parsed without issues."
}, {
    input: `
        from: Rati 🐭
        in: 🏡 cody cottage
        message: A tale for you, dear friends... of starlight and moonbeams, of whispers in the wind...
        `,
    expected: [{
        from: "Rati 🐭",
        in: "🏡 cody cottage",
        message: "A tale for you, dear friends... of starlight and moonbeams, of whispers in the wind..."
    }],
    description: "Malformed YAML without proper delimiters should be handled anyway."
}, {
    input: `
        ---
        from: WhiskerWind 🍃
        in: old-oak-tree
        message: 
          - detail: "✨️💫🌟"
          - moreDetail:
              deepNest: "Complex nested structure"
        ---
        `,
    expected: [{
        from: "WhiskerWind 🍃",
        in: "old-oak-tree",
        message: [
            { detail: "✨️💫🌟" },
            { moreDetail: { deepNest: "Complex nested structure" } }
        ]
    }],
    description: "Complex nested structures should be parsed correctly."
}, {
    input: `{"from": "Rati 🐭", "in": "🏡 cody cottage", "message": "JSON formatted string"}`,
    expected: [{
        from: "Rati 🐭",
        in: "🏡 cody cottage",
        message: "JSON formatted string"
    }],
    description: "Non-YAML formatted input should be handled."
}, {
    input: `
        ---
        from: "Luna 🌙"
        in: "old-oak-tree"
        message: "Message with special characters: @#$%^&*()"
        ---
        `,
    expected: [{
        from: "Luna 🌙",
        in: "old-oak-tree",
        message: "Message with special characters: @#$%^&*()"
    }],
    description: "Special characters and emojis should be parsed correctly without corruption."
}, {
    input: `   `,
    expected: [],
    description: "Empty input should return an empty array."
}
];