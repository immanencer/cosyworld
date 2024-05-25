// The old steam clock ticks faster and faster.
import { createTask, pollTaskCompletion } from '../services/taskManager.js';

async function sendOminousMessage() {
    const message = Math.random() < 0.5 ?
        'tick and whirr and sputter ominously in a SHORT clocklike fashion. do not speak' :
        'toll a single SHORT ominous prophecy in latin in a clocklike fashion. do not translate';

    const taskId = await createTask('steamclock', [message]);
    await pollTaskCompletion(taskId);

    setTimeout(sendOminousMessage, Math.random() * 259200000); // 72 hours in milliseconds
}
export const steamclock = {
    on_message: message => {
        if (message.content.toLowerCase().includes('kick') || message.content.toLowerCase().includes('clock')) {
            sendOminousMessage();
        }
        return false;
    }
};