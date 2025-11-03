// socket.js - Updated Socket.io client setup
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');

  // Connect to socket server with user data
  const connect = (userData) => {
    socket.connect();
    if (userData) {
      socket.emit('user_join', userData);
      setCurrentRoom(userData.room || 'general');
    }
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
  };

  // Send a message
  const sendMessage = (messageData) => {
    socket.emit('send_message', messageData);
  };

  // Send a private message
  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  // Set typing status
  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
  };

  // Join a room
  const joinRoom = (roomName) => {
    socket.emit('join_room', roomName);
    setCurrentRoom(roomName);
  };

  // Mark message as read
  const markMessageAsRead = (messageId) => {
    socket.emit('message_read', messageId);
  };

  // Add reaction to message
  const addMessageReaction = (messageId, reaction) => {
    socket.emit('message_reaction', { messageId, reaction });
  };

  // Socket event listeners
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to server');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    };

    // Message events
    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };

    const onPreviousMessages = (previousMessages) => {
      setMessages(previousMessages);
    };

    const onMessageDelivered = (deliveryData) => {
      // Update the temporary message with the actual ID
      setMessages(prev => prev.map(msg => 
        msg.tempId === deliveryData.tempId 
          ? { ...msg, id: deliveryData.messageId, tempId: undefined }
          : msg
      ));
    };

    const onMessageReadUpdate = (readData) => {
      setMessages(prev => prev.map(msg => 
        msg.id === readData.messageId 
          ? { ...msg, readBy: readData.readBy }
          : msg
      ));
    };

    const onMessageReactionUpdate = (reactionData) => {
      setMessages(prev => prev.map(msg => 
        msg.id === reactionData.messageId 
          ? { ...msg, reactions: reactionData.reactions }
          : msg
      ));
    };

    // User events
    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = (user) => {
      // Add system message for user joining
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          system: true,
          message: `${user.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserLeft = (user) => {
      // Add system message for user leaving
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          system: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserJoinedRoom = (user) => {
      // Add system message for user joining room
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          system: true,
          message: `${user.username} joined the room`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const onUserLeftRoom = (user) => {
      // Add system message for user leaving room
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          system: true,
          message: `${user.username} left the room`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    // Typing events
    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

    // Room events
    const onRoomChanged = (room) => {
      setCurrentRoom(room);
      setMessages([]); // Clear messages when changing rooms
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('previous_messages', onPreviousMessages);
    socket.on('message_delivered', onMessageDelivered);
    socket.on('message_read_update', onMessageReadUpdate);
    socket.on('message_reaction_update', onMessageReactionUpdate);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('user_joined_room', onUserJoinedRoom);
    socket.on('user_left_room', onUserLeftRoom);
    socket.on('typing_users', onTypingUsers);

    // Clean up event listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('previous_messages', onPreviousMessages);
      socket.off('message_delivered', onMessageDelivered);
      socket.off('message_read_update', onMessageReadUpdate);
      socket.off('message_reaction_update', onMessageReactionUpdate);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('user_joined_room', onUserJoinedRoom);
      socket.off('user_left_room', onUserLeftRoom);
      socket.off('typing_users', onTypingUsers);
    };
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    currentRoom,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    joinRoom,
    markMessageAsRead,
    addMessageReaction,
  };
};

export default socket;