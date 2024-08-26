import React, { useEffect } from 'react';
import './ChannelsPanel.css';
import channels from '../mockData/channels';

function ChannelsPanel({ selectedChannels, setSelectedChannels, primaryChannel, setPrimaryChannel }) {

  useEffect(() => {
    if (selectedChannels.length === 0 && channels.length > 0) {
      setPrimaryChannel(channels[0].id);
      setSelectedChannels([channels[0].id]);
    }
  }, [selectedChannels, setSelectedChannels, setPrimaryChannel]);

  const handleChannelSelect = (channel) => {
    if (primaryChannel === channel) {
      return;
    }

    if (selectedChannels.includes(channel)) {
      // Deselect the channel if it's already selected
      setSelectedChannels((prev) => prev.filter((ch) => ch !== channel));

      // If primaryChannel is deselected, set a new primaryChannel from remaining selected channels
      if (primaryChannel === channel && selectedChannels.length > 1) {
        setPrimaryChannel(selectedChannels.filter((ch) => ch !== channel)[0]);
      }
    } else {
      // Update the primary channel
      setPrimaryChannel(channel);

      // Add the new primary channel to the selected channels
      if (selectedChannels.length >= 3) {
        // If three channels are already selected, replace the oldest selected channel with the new one
        setSelectedChannels((prev) => [...prev.slice(1), channel]);
      } else {
        setSelectedChannels((prev) => [...prev, channel]);
      }
    }
  };

  return (
    <div className="channels-panel">
      <h2>Channels</h2>
      {channels.map((channel) => (
        <div
          key={channel.id}
          className={`channel ${selectedChannels.includes(channel.id) ? 'selected' : ''} ${primaryChannel === channel.id ? 'primary' : ''}`}
          onClick={() => handleChannelSelect(channel.id)}
        >
          {channel.name} {primaryChannel === channel.id ? '(Primary)' : ''}
        </div>
      ))}
    </div>
  );
}

export default ChannelsPanel;
