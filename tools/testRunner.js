async function runTests(testFunction, tests) {
    let totalPassed = 0;

    for(let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const result = await testFunction(test.input);
        const passed = JSON.stringify(result) === JSON.stringify(test.expected);
        if (!passed) {
            console.log(`Test ${i + 1} - ${test.description} ❌ Failed`);
            console.log("Expected:", JSON.stringify(test.expected));
            console.log("Received:", JSON.stringify(result));
        } else {
            totalPassed++;
        }
    }

    reportResults(totalPassed, tests.length);
}

function reportResults(totalPassed, totalTests) {
    const passedEmoji = totalPassed === totalTests ? "🎉" : "😕";
    console.log(`\nFinal Report: ${totalPassed} out of ${totalTests} tests passed. ${passedEmoji}`);
    if (totalPassed < totalTests) {
        console.log(`Some tests failed. Please review the outputs above. 🔍`);
    } else {
        console.log("All tests passed! Great job! 🚀");
    }
}

export { runTests };
