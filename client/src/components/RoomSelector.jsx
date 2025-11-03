import React, { useState, useEffect } from 'react';

const RoomSelector = ({ currentRoom, onRoomChange }) => {
  const [rooms, setRooms] = useState(['general', 'random', 'tech']);

  useEffect(() => {
    // Fetch available rooms from server
    const fetchRooms = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/rooms');
        const data = await response.json();
        setRooms(data);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      }
    };

    fetchRooms();
  }, []);

  return (
    <div className="room-selector">
      <h3>Chat Rooms</h3>
      <div className="room-list">
        {rooms.map((room) => (
          <button
            key={room}
            className={`room-button ${room === currentRoom ? 'active' : ''}`}
            onClick={() => onRoomChange(room)}
          >
            # {room}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoomSelector; 
