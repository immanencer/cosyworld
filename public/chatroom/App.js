import React, { useState } from 'react';
import ChannelsPanel from './components/ChannelsPanel';
import ChatWindow from './components/ChatWindow';
import InfoPanel from './components/InfoPanel';
import './styles/App.css';

function App() {
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);

  return (
    <div className="app-container">
      <ChannelsPanel
        selectedChannels={selectedChannels}
        setSelectedChannels={setSelectedChannels}
      />
      <ChatWindow selectedChannels={selectedChannels} />
      <InfoPanel open={infoPanelOpen} setOpen={setInfoPanelOpen} />
    </div>
  );
}

export default App;
