import React, { useEffect, useState } from 'react';
import './ChatWindow.css';
import messages from '../mockData/messages';
import { useMergedMessages } from '../hooks/useMergedMessages';

function ChatWindow({ selectedChannels }) {
  const [chatMessages, setChatMessages] = useMergedMessages(selectedChannels);

  useEffect(() => {
    // Fetch messages from the server for the selected channels.
    setChatMessages(messages.filter((msg) => selectedChannels.includes(msg.channelId)));
  }, [selectedChannels, setChatMessages]);

  return (
    <div className="chat-window">
      {chatMessages.map((msg) => (
        <div key={msg.signature} className="message">
          <span className="prev-signature">[{msg.prev_signature}]</span>
          <span className="channel">({msg.channel})</span>
          <span className="author">{msg.author}:</span>
          <span className="content">{msg.content}</span>
          <span className="signature">[{msg.signature}]</span>
        </div>
      ))}
    </div>
  );
}

export default ChatWindow;
