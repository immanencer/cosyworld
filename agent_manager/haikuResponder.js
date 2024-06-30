import { waitForTask } from './task.js';

export async function checkShouldRespond(avatar, conversation) {
    const recentConversation = conversation.slice(-10);
    const haiku = await waitForTask(avatar, [
        ...recentConversation,
        `(${avatar.location.name}) ${avatar.name}: I will write a haiku to decide whether to respond.`
    ]);

    console.log(`Haiku from ${avatar.name}:\n${haiku}`);

    const haikuCheck = await waitForTask({personality: 'You are an excellent judge of intention'}, [
`${avatar.name} has written this haiku to decide whether to respond:

${haiku}

Answer with YES or NO depending on the message of the haiku.`]
    );

    console.log(`Haiku check for ${avatar.name}: ${haikuCheck}`);

    const shouldRespond = haikuCheck && haikuCheck.toLowerCase().includes('yes');
    avatar.feelings = [haiku, ...[avatar.feelings || []]];
    console.log(`Haiku check for ${avatar.name}: ${shouldRespond ? 'Passed' : 'Failed'}`);
    return shouldRespond;
}