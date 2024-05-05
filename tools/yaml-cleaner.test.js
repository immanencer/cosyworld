import { cleanYAML } from './yaml-cleaner.js'; // Ensure this path matches the location of your function


import TEST_CASES from './yaml-cleaner.tests.js';
import { runTests } from './testRunner.js';

await runTests(cleanYAML, TEST_CASES);
