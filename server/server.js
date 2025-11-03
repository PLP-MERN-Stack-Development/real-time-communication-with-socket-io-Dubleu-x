// server.js - Enhanced with additional features
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced data storage
const users = new Map();
const messages = new Map(); // room -> messages array
const typingUsers = new Map();
const rooms = ['general', 'random', 'tech'];

// Initialize messages for each room
rooms.forEach(room => {
  messages.set(room, []);
});

// Utility functions
const getOnlineUsers = () => Array.from(users.values());
const getUserBySocketId = (socketId) => users.get(socketId);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining with authentication
  socket.on('user_join', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      room: userData.room || 'general',
      isOnline: true,
      joinedAt: new Date().toISOString()
    };
    
    users.set(socket.id, user);
    
    // Join room
    socket.join(user.room);
    
    // Notify others
    socket.to(user.room).emit('user_joined', user);
    io.to(user.room).emit('user_list', getOnlineUsers().filter(u => u.room === user.room));
    
    // Send room messages to the new user
    const roomMessages = messages.get(user.room) || [];
    socket.emit('previous_messages', roomMessages);
    
    console.log(`${user.username} joined room: ${user.room}`);
  });

  // Handle chat messages with read receipts
  socket.on('send_message', (messageData) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;

    const message = {
      ...messageData,
      id: Date.now() + Math.random(),
      sender: user.username,
      senderId: socket.id,
      room: user.room,
      timestamp: new Date().toISOString(),
      readBy: [socket.id] // Sender has read the message
    };

    const roomMessages = messages.get(user.room) || [];
    roomMessages.push(message);
    
    // Limit stored messages
    if (roomMessages.length > 200) {
      roomMessages.shift();
    }
    messages.set(user.room, roomMessages);

    // Emit to room with delivery confirmation
    socket.to(user.room).emit('receive_message', message);
    
    // Acknowledge delivery to sender
    socket.emit('message_delivered', { 
      tempId: messageData.tempId, 
      messageId: message.id 
    });
  });

  // Message read receipt
  socket.on('message_read', (messageId) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;

    const roomMessages = messages.get(user.room) || [];
    const message = roomMessages.find(m => m.id === messageId);
    
    if (message && !message.readBy.includes(socket.id)) {
      message.readBy.push(socket.id);
      io.to(user.room).emit('message_read_update', {
        messageId,
        readBy: message.readBy
      });
    }
  });

  // Typing indicators
  socket.on('typing', (isTyping) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;

    if (isTyping) {
      typingUsers.set(socket.id, user.username);
    } else {
      typingUsers.delete(socket.id);
    }

    socket.to(user.room).emit('typing_users', 
      Array.from(typingUsers.values()).filter((_, id) => {
        const typingUser = getUserBySocketId(id);
        return typingUser && typingUser.room === user.room;
      })
    );
  });

  // Room management
  socket.on('join_room', (roomName) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;

    // Leave previous room
    socket.leave(user.room);
    socket.to(user.room).emit('user_left_room', user);

    // Join new room
    user.room = roomName;
    socket.join(roomName);
    
    // Notify new room
    socket.to(roomName).emit('user_joined_room', user);
    
    // Send room messages
    const roomMessages = messages.get(roomName) || [];
    socket.emit('previous_messages', roomMessages);
    
    // Update user lists
    io.to(roomName).emit('user_list', 
      getOnlineUsers().filter(u => u.room === roomName)
    );
  });

  // Private messaging
  socket.on('private_message', ({ to, message }) => {
    const fromUser = getUserBySocketId(socket.id);
    const toUser = getOnlineUsers().find(u => u.id === to);

    if (!fromUser || !toUser) return;

    const privateMessage = {
      id: Date.now() + Math.random(),
      from: fromUser.username,
      fromId: socket.id,
      to: toUser.username,
      toId: to,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true
    };

    // Send to both users
    socket.to(to).emit('private_message', privateMessage);
    socket.emit('private_message', privateMessage);
  });

  // Message reactions
  socket.on('message_reaction', ({ messageId, reaction }) => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;

    const roomMessages = messages.get(user.room) || [];
    const message = roomMessages.find(m => m.id === messageId);
    
    if (message) {
      if (!message.reactions) {
        message.reactions = {};
      }
      
      if (!message.reactions[reaction]) {
        message.reactions[reaction] = [];
      }
      
      // Toggle reaction
      const userIndex = message.reactions[reaction].indexOf(user.username);
      if (userIndex > -1) {
        message.reactions[reaction].splice(userIndex, 1);
      } else {
        message.reactions[reaction].push(user.username);
      }
      
      io.to(user.room).emit('message_reaction_update', {
        messageId,
        reactions: message.reactions
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    const user = getUserBySocketId(socket.id);
    
    if (user) {
      users.delete(socket.id);
      typingUsers.delete(socket.id);
      
      // Notify room
      socket.to(user.room).emit('user_left', user);
      io.to(user.room).emit('user_list', 
        getOnlineUsers().filter(u => u.room === user.room)
      );
      
      console.log(`${user.username} disconnected: ${reason}`);
    }
  });

  // Handle reconnection
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Reconnection attempt ${attemptNumber} for ${socket.id}`);
  });
});

// Enhanced API routes
app.get('/api/messages/:room', (req, res) => {
  const roomMessages = messages.get(req.params.room) || [];
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const startIndex = (page - 1) * limit;
  
  const paginatedMessages = roomMessages.slice(startIndex, startIndex + limit);
  
  res.json({
    messages: paginatedMessages.reverse(),
    hasMore: startIndex + limit < roomMessages.length,
    total: roomMessages.length
  });
});

app.get('/api/rooms', (req, res) => {
  res.json(rooms);
});

app.get('/api/users', (req, res) => {
  res.json(getOnlineUsers());
});

app.get('/api/search', (req, res) => {
  const query = req.query.q?.toLowerCase();
  if (!query) return res.json([]);

  const results = [];
  messages.forEach((roomMessages, room) => {
    roomMessages.forEach(message => {
      if (message.message?.toLowerCase().includes(query)) {
        results.push({ ...message, room });
      }
    });
  });

  res.json(results.slice(0, 50)); // Limit results
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available rooms: ${rooms.join(', ')}`);
});