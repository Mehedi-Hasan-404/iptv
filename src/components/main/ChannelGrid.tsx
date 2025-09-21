'use client';
import { useState } from 'react';
import { PublicChannel } from '@/types';
import ChannelCard from './ChannelCard';
import { SearchIcon, XIcon } from './Icons';

const ChannelGrid = ({ channels }: { channels: PublicChannel[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredChannels = channels.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <div className="search-bar" style={{ display: 'flex' }}>
        <button className="search-button"><SearchIcon /></button>
        <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
            placeholder="Search channels..."
          />
          {searchTerm && <button className="clear-button" onClick={() => setSearchTerm('')}><XIcon /></button>}
        </div>
      </div>
      <div id="channelGrid" className="grid">
        {filteredChannels.length > 0 ? (
          filteredChannels.map(channel => <ChannelCard key={channel.id} channel={channel} />)
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <h3>No Channels Found</h3>
          </div>
        )}
      </div>
    </>
  );
};
export default ChannelGrid;
