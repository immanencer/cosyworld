
function extractYAMLContent(text) {
  // Enhanced regex to capture blocks that might have leading/trailing spaces and can appear anywhere in the text
  const regex = /(```yaml\s*([\s\S]+?)\s*```)|(\s*---\s*([\s\S]+?)\s*---\s*)/gm;

  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
      // Extract the YAML content from the appropriate regex group, considering new group indices
      const yamlContent = match[2] || match[4]; 
      if (yamlContent) {
          // Trim the extracted content to remove unnecessary newlines and spaces
          matches.push(yamlContent.trim().replace(/\n\s+/g, '\n'));
      }
  }

  if (matches.length === 0) {
    console.log('⚠️ No YAML blocks found in the input text');

    const altMatches = [
      extractMultipleYAMLContent_Normalize,
      JSYAML_ADVANCED,
      JSYAML_BASIC,
    ];

    for (const altMatch of altMatches) {
      const altMatches = altMatch(text);
      if (altMatches.length > 0) {
        console.log('✅ Found YAML blocks using the alternative approach: ', altMatch.name || 'anonymous function');
        return altMatches;
      }
    }

    console.log('🚫 No YAML blocks found using the alternative approach');
  }
  return matches || [];
}

function extractMultipleYAMLContent_Normalize(text) {
    // Normalize line endings and ensure uniformity in block delimiters
    text = text.replace(/\r\n?/g, '\n').replace(/(```yaml|```)/g, '---');

    // Regex to capture YAML blocks, ignoring '---' within quotes
    const regex = /---\s+([\s\S]+?)\s+---(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/g;

    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match[1].trim()) { // Only add non-empty results
            matches.push(match[1].trim());
        }
    }

    if (matches.length === 0) {
        console.log('⚠️ No YAML blocks found in the input text.');
    }
    return matches;
  }

  import yaml from 'js-yaml';

function JSYAML_BASIC(text) {
    try {
        // Attempt to parse the entire text as a single YAML document
        const doc = yaml.loadAll(text);
        return doc.map(item => JSON.stringify(item, null, 2));
    } catch (error) {
        console.log('⚠️ Failed to parse YAML:', error.message);
        return []; // Return an empty array if parsing fails
    }
}

function JSYAML_ADVANCED(text) {
  // Normalize and prepare the text for parsing
  text = text.replace(/\r\n?/g, '\n');  // Normalize newlines
  text = text.replace(/(```yaml|```)/g, '---');  // Standardize delimiters

  // Split input into chunks based on YAML delimiters
  const chunks = text.split(/---\s*/);
  const results = [];

  for (let chunk of chunks) {
      if (chunk.trim()) {
          try {
              const parsed = yaml.load(chunk);
              if (parsed) {
                  results.push(JSON.stringify(parsed, null, 2));
              }
          } catch (error) {
              console.log('⚠️ Failed to parse chunk:', error.message);
              // Optionally show the problematic chunk for debugging
              console.log('Problematic chunk:', chunk);
          }
      }
  }

  if (results.length === 0) {
      console.log('⚠️ No valid YAML blocks found.');
  }
  return results;
}

  export { extractYAMLContent };