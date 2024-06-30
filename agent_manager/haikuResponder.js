import { waitForTask } from './task.js';

export async function checkShouldRespond(avatar, conversation) {
    const recentConversation = conversation.slice(-10);
    const haiku = await waitForTask({
        personality: `You are the haiku master executive function for this person:\n\n${avatar.personality}\n\nRespond with a haiku to decide whether to respond to the conversation above.` 
    }, [
        ...recentConversation,
        `Respond with ONLY a haiku to decide whether to respond to the conversation above.`
    ]);
    const haikuCheck = await waitForTask({personality: 'You are an excellent judge of intention'}, [
`${avatar.name} has written this haiku to decide whether to respond:

${haiku}

Answer with YES or NO depending on the message of the haiku.`]
    );
    const shouldRespond = haikuCheck && haikuCheck.toLowerCase().includes('yes');
    avatar.feelings = [haiku, ...[avatar.feelings || []]];
    console.log(`Haiku check for ${avatar.name}: ${shouldRespond ? 'Passed' : 'Failed'}`);
    return shouldRespond;
}