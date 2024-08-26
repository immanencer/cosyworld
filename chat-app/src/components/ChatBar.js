import React, { useState } from 'react';
import './ChatBar.css';

function ChatBar({ onSendMessage }) {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim() !== '') {
      onSendMessage(message);
      setMessage(''); // Clear the input after sending
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="chat-bar">
      <input
        type="text"
        className="chat-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
      />
      <button className="send-button" onClick={handleSendMessage}>
        Send
      </button>
    </div>
  );
}

export default ChatBar;
