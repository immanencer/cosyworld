import React from 'react';
import './ChannelsPanel.css';
import channels from '../mockData/channels';

function ChannelsPanel({ selectedChannels, setSelectedChannels }) {
  const handleChannelSelect = (channel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((ch) => ch !== channel)
        : [...prev, channel]
    );
  };

  return (
    <div className="channels-panel">
      <h2>Channels</h2>
      {channels.map((channel) => (
        <div
          key={channel.id}
          className={`channel ${selectedChannels.includes(channel.id) ? 'selected' : ''}`}
          onClick={() => handleChannelSelect(channel.id)}
        >
          {channel.name}
        </div>
      ))}
    </div>
  );
}

export default ChannelsPanel;
