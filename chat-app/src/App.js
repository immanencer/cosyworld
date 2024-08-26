import React, { useState } from 'react';
import ChannelsPanel from './components/ChannelsPanel';
import ChatWindow from './components/ChatWindow';
import InfoPanel from './components/InfoPanel';
import './styles/App.css';

function App() {
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [primaryChannel, setPrimaryChannel] = useState(null);

  return (
    <div className="app-container">
      <ChannelsPanel
        selectedChannels={selectedChannels}
        setSelectedChannels={setSelectedChannels}
        primaryChannel={primaryChannel}
        setPrimaryChannel={setPrimaryChannel}
      />
      <ChatWindow selectedChannels={selectedChannels} primaryChannel={primaryChannel} />
      <InfoPanel />
    </div>
  );
}

export default App;
