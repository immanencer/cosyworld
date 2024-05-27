/**
 * Cleans up and attempts to fix common JSON formatting errors in a string.
 * @param {string} jsonString - The JSON string to clean up.
 * @returns {string} A cleaned-up JSON string.
 */
export default function cleanJson(jsonString) {
    try {
        // First, we'll try to parse it to see if it's already valid
        JSON.parse(jsonString);
        return jsonString; // If no error, return the original string
    } catch (error) {
        // If parsing fails, attempt to fix common issues

        // Replace unescaped single quotes with double quotes
        jsonString = jsonString.replace(/'/g, '"');

        // Add double quotes around any unquoted keys
        jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

        // Escape unescaped double quotes within strings (that are not at the start or end of the string)
        jsonString = jsonString.replace(/:"(.*?[^\\])"(,|})/g, (match, p1, p2) => {
            return ':"' + p1.replace(/"/g, '\\"') + '"' + p2;
        });

        // Attempt to re-parse to check if the fixes worked
        try {
            JSON.parse(jsonString);
            return jsonString; // If no error after fixes, return the fixed string
        } catch (finalError) {
            // If it still fails, log the error and return the original faulty JSON string
            console.error('Failed to fix JSON:', finalError);
            return jsonString; // Return the faulty string for manual checking
        }
    }
}