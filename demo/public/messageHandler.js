import { sendChatMessage, fetchChannelMessages } from './api.js';

marked.setOptions({
    breaks: true,
    gfm: true
});

const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const channelList = document.getElementById('channel-list');

let avatars = [];
let currentChannel = null;
let setCurrentChannel = null;
let userAvatar = null;

export function initializeMessageHandling(avatarList, setChannelCallback, currentUserAvatar) {
    avatars = avatarList;
    setCurrentChannel = setChannelCallback;
    userAvatar = currentUserAvatar;

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    channelList.addEventListener('click', handleChannelClick);
}

async function handleChannelClick(e) {
    const channelItem = e.target.closest('.channel-item');
    if (channelItem) {
        currentChannel = channelItem.dataset.channel;
        setCurrentChannel(currentChannel);
        chatMessages.innerHTML = '';
        addMessage('system', `Now chatting in ${currentChannel}`);
        
        try {
            const messages = await fetchChannelMessages(currentChannel);
            messages.filter(msg => !!msg.content).forEach(msg => addMessage(msg.avatar, msg.content));
        } catch (error) {
            console.error('Error loading messages:', error);
            addMessage('system', 'Failed to load previous messages.');
        }
    }
}

function addMessage(avatar, content) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    const pfpElement = document.createElement('img');
    pfpElement.classList.add('message-pfp');
    pfpElement.src = avatars.find(a => a.name === avatar)?.avatar || 'https://i.imgur.com/kAzsrdp.png';
    pfpElement.alt = avatar;
    messageElement.appendChild(pfpElement);
    
    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    contentElement.innerHTML = marked.parse(content);
    messageElement.appendChild(contentElement);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return contentElement;
}

async function sendMessage() {
    if (!currentChannel) {
        alert('Please select a channel to chat with.');
        return;
    }

    const message = userInput.value.trim();
    if (message) {
        addMessage(userAvatar, message);
        userInput.value = '';

        try {
            const response = await sendChatMessage(currentChannel, message, userAvatar);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let accumulatedResponses = {};

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const responses = chunk.split('\n').filter(Boolean);

                for (const response of responses) {
                    const { avatar, content } = JSON.parse(response);
                    
                    if (!accumulatedResponses[avatar]) {
                        accumulatedResponses[avatar] = {
                            content: '',
                            element: addMessage(avatar, '')
                        };
                    }
                    
                    accumulatedResponses[avatar].content += content;
                    accumulatedResponses[avatar].element.innerHTML = marked.parse(accumulatedResponses[avatar].content);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('system', 'Sorry, I encountered an error.');
        }
    }
}