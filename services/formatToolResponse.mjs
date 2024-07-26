export function formatToolResponse(toolResponse, location) {
    location = location || '' ;
    let toolName = 'UNKNOWN TOOL';
    let content = '';

    if (toolResponse.name) {
        toolName = toolResponse.name.toUpperCase();
    }

    if (toolResponse.content) {
        try {
            const parsedContent = JSON.parse(toolResponse.content);
            if (parsedContent.error) {
                content = `error: ${parsedContent.error}`;
            } else if (parsedContent.result) {
                content = `result: ${JSON.stringify(parsedContent.result)}`;
            } else {
                content = `result: ${JSON.stringify(parsedContent)}`;
            }
        } catch (error) {
            // If parsing fails, use the content as is
            content = `result: ${toolResponse.content}`;
        }
    }

    return `(${location}) ${toolName}: ${content}`;
}