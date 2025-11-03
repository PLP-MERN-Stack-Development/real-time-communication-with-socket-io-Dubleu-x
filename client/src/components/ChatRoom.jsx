import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../socket/socket';

const ChatRoom = ({ username }) => {
  const {
    socket,
    isConnected,
    messages,
    users,
    typingUsers,
    currentRoom,
    connect,
    disconnect,
    sendMessage,
    setTyping,
    joinRoom,
    markMessageAsRead,
    addMessageReaction
  } = useSocket();

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [rooms] = useState(['general', 'random', 'tech']);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Connect to socket when component mounts
    connect({ username, room: 'general' });

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [username]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when they become visible
  useEffect(() => {
    messages.forEach(message => {
      if (!message.readBy?.includes(socket.id) && message.sender !== username) {
        markMessageAsRead(message.id);
      }
    });
  }, [messages, username, socket.id]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && isConnected) {
      sendMessage({
        message: newMessage.trim(),
        tempId: Date.now()
      });
      setNewMessage('');
      handleTyping(false);
    }
  };

  const handleTyping = (typing) => {
    setIsTyping(typing);
    setTyping(typing);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTyping(false);
      }, 3000);
    }
  };

  const handleRoomChange = (room) => {
    joinRoom(room);
  };

  const handleReaction = (messageId, reaction) => {
    addMessageReaction(messageId, reaction);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#1a1a1a',
      color: 'white'
    }}>
      {/* Header */}
      <div style={{
        background: '#2d2d2d',
        padding: '1rem',
        borderBottom: '1px solid #444',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Chat Room: #{currentRoom}</h2>
          <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
            {users.length} users online
          </div>
        </div>
        <div style={{ color: isConnected ? '#4CAF50' : '#f44336' }}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <div>Welcome, {username}!</div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: '250px',
          background: '#2d2d2d',
          borderRight: '1px solid #444',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          {/* Room Selector */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#ccc', marginBottom: '1rem' }}>Rooms</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {rooms.map(room => (
                <button
                  key={room}
                  onClick={() => handleRoomChange(room)}
                  style={{
                    padding: '0.5rem',
                    background: room === currentRoom ? '#4CAF50' : 'transparent',
                    border: '1px solid #555',
                    color: 'white',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  # {room}
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          <div>
            <h3 style={{ color: '#ccc', marginBottom: '1rem' }}>
              Online Users ({users.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {users.map(user => (
                <div 
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '5px',
                    background: user.username === username ? 'rgba(76, 175, 80, 0.2)' : 'transparent'
                  }}
                >
                  <span style={{ color: '#4CAF50', fontSize: '0.7rem' }}>🟢</span>
                  <span style={{ fontSize: '0.9rem' }}>
                    {user.username}
                    {user.username === username && ' (You)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                marginTop: '2rem' 
              }}>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id || message.tempId}
                  style={{
                    background: message.sender === username ? '#4CAF50' : 
                               message.system ? 'transparent' : '#2d2d2d',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    maxWidth: '70%',
                    alignSelf: message.sender === username ? 'flex-end' : 'flex-start',
                    border: message.isPrivate ? '2px solid #ff9800' : 'none'
                  }}
                >
                  {!message.system && (
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.25rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        color: message.sender === username ? 'rgba(255,255,255,0.9)' : '#ff9800'
                      }}>
                        {message.sender}
                        {message.isPrivate && ' 🔒'}
                      </div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: 'rgba(255,255,255,0.6)'
                      }}>
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ 
                    wordWrap: 'break-word',
                    fontStyle: message.system ? 'italic' : 'normal',
                    color: message.system ? '#666' : 'white'
                  }}>
                    {message.message}
                  </div>

                  {/* Message Reactions */}
                  {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div style={{ 
                      marginTop: '0.5rem',
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      {Object.entries(message.reactions).map(([reaction, users]) => (
                        users.length > 0 && (
                          <button
                            key={reaction}
                            onClick={() => handleReaction(message.id, reaction)}
                            style={{
                              background: 'rgba(255,255,255,0.1)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '10px',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.7rem',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            {reaction} {users.length}
                          </button>
                        )
                      ))}
                    </div>
                  )}

                  {/* Read Receipts */}
                  {message.readBy && message.readBy.length > 1 && (
                    <div style={{
                      fontSize: '0.6rem',
                      color: 'rgba(255,255,255,0.4)',
                      marginTop: '0.25rem',
                      textAlign: 'right'
                    }}>
                      Read by {message.readBy.length - 1} users
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div style={{
              padding: '0 1rem 0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#666',
              fontStyle: 'italic',
              fontSize: '0.9rem'
            }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                <span style={{
                  width: '4px',
                  height: '4px',
                  background: '#666',
                  borderRadius: '50%',
                  animation: 'typing 1.4s infinite ease-in-out'
                }}></span>
                <span style={{
                  width: '4px',
                  height: '4px',
                  background: '#666',
                  borderRadius: '50%',
                  animation: 'typing 1.4s infinite ease-in-out',
                  animationDelay: '0.16s'
                }}></span>
                <span style={{
                  width: '4px',
                  height: '4px',
                  background: '#666',
                  borderRadius: '50%',
                  animation: 'typing 1.4s infinite ease-in-out',
                  animationDelay: '0.32s'
                }}></span>
              </div>
              <span>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          {/* Message Input */}
          <form onSubmit={handleSendMessage} style={{
            padding: '1rem',
            background: '#2d2d2d',
            borderTop: '1px solid #444'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  if (e.target.value.length === 1) {
                    handleTyping(true);
                  } else if (e.target.value.length === 0) {
                    handleTyping(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleSendMessage(e);
                  }
                }}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
                disabled={!isConnected}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #555',
                  borderRadius: '25px',
                  background: '#1a1a1a',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
              <button 
                type="submit" 
                disabled={!isConnected || !newMessage.trim()}
                style={{
                  padding: '12px 24px',
                  background: isConnected && newMessage.trim() ? '#4CAF50' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  cursor: isConnected && newMessage.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* CSS Animation for typing indicator */}
      <style>{`
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ChatRoom;