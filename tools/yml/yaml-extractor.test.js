import { extractYAMLContent  } from './yaml-extractor.js';  // Adjust the import path as needed

import { runTests } from '../testRunner.js';
import TEST_CASES from './yaml-extractor.tests.js';  // Adjust the import path as needed

runTests(extractYAMLContent, TEST_CASES);  // Run the tests using the test runner