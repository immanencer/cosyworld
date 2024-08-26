import React, { useEffect, useState, useRef } from 'react';
import './ChatWindow.css';
import messages from '../mockData/messages';
import ChatBar from './ChatBar';

function ChatWindow({ selectedChannels, primaryChannel }) {
  const [chatMessages, setChatMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setChatMessages(messages.filter((msg) => selectedChannels.includes(msg.channelId)));
  }, [selectedChannels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = (messageContent) => {
    if (!primaryChannel) return;

    const newMessage = {
      prev_signature: chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].signature : 'start',
      channel: primaryChannel,
      author: 'User',
      content: messageContent,
      signature: `sig${Date.now()}`,
      channelId: primaryChannel,
    };

    setChatMessages([...chatMessages, newMessage]);
  };

  return (
    <div className="chat-window">
      <div className="messages-container">
        <div className="messages">
          {chatMessages.map((msg) => (
            <div key={msg.signature} className="message">
              <span className="prev-signature">[{msg.prev_signature}]</span>
              <span className="channel">({msg.channel})</span>
              <span className="author">{msg.author}:</span>
              <span className="content">{msg.content}</span>
              <span className="signature">[{msg.signature}]</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatBar onSendMessage={handleSendMessage} />
    </div>
  );
}

export default ChatWindow;
