import React from 'react';
import './InfoPanel.css';

function InfoPanel({ open, setOpen }) {
  return (
    <div className={`info-panel ${open ? 'open' : 'closed'}`}>
      <button onClick={() => setOpen(!open)}>Toggle Info</button>
      {open && (
        <div>
          <h2>Information Panel</h2>
          <p>This panel can be used to display user profiles, server information, etc.</p>
        </div>
      )}
    </div>
  );
}

export default InfoPanel;
