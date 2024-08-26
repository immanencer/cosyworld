import { useState, useEffect } from 'react';

export const useMergedMessages = (selectedChannels) => {
  const [mergedMessages, setMergedMessages] = useState([]);

  useEffect(() => {
    if (selectedChannels.length === 0) {
      setMergedMessages([]);
      return;
    }

    // Mock fetching and merging messages based on selected channels
    const fetchedMessages = mockFetchMessages(selectedChannels);

    setMergedMessages(fetchedMessages);
  }, [selectedChannels]);

  return [mergedMessages, setMergedMessages];
};

// Mock function to mimic fetching messages
const mockFetchMessages = (channels) => {
  // Example logic to fetch and merge messages
  const allMessages = []; // This would come from the server
  return allMessages.filter((msg) => channels.includes(msg.channelId));
};
