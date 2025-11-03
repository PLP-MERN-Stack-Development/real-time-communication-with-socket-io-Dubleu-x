import React, { useEffect, useRef } from 'react';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id || message.tempId}
            className={`message ${message.sender === currentUser ? 'own-message' : ''} ${
              message.system ? 'system-message' : ''
            } ${message.isPrivate ? 'private-message' : ''}`}
          >
            {!message.system && (
              <div className="message-header">
                <span className="message-sender">
                  {message.sender}
                  {message.isPrivate && ' 🔒'}
                </span>
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            )}
            <div className="message-content">
              {message.message}
            </div>
            {message.reactions && (
              <div className="message-reactions">
                {Object.entries(message.reactions).map(([reaction, users]) => (
                  users.length > 0 && (
                    <span key={reaction} className="reaction">
                      {reaction} {users.length}
                    </span>
                  )
                ))}
              </div>
            )}
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;