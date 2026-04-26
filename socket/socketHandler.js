// socket/socketHandler.js
const socketHandler = (io) => {
  io.on('connection', (socket) => {
    // Client joins their personal room after login
    socket.on('join', ({ userId, role }) => {
      socket.join(userId);
      if (role === 'admin')  socket.join('admin-room');
      if (role === 'doctor') socket.join(`doctor-${userId}`);
    });

    socket.on('disconnect', () => {
      // cleanup handled automatically by socket.io
    });
  });
};

module.exports = socketHandler;
