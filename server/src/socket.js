const { Server } = require('socket.io');
const Room = require('./game/Room');

const activeRooms = new Map();

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: 'https://signal-project-six.vercel.app',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[+] Connection established: ${socket.id}`);

    socket.on('JOIN_ROOM', ({ roomId, username }, callback) => {
      if (!roomId || !username) {
        return callback({ error: 'Room ID and Username are required.' });
      }

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Room(roomId, io)); 
      }

      const room = activeRooms.get(roomId);
      const successfullyJoined = room.addPlayer(socket.id, username);
      
      if (!successfullyJoined) {
        return callback({ error: 'Room is full (max 4 players).' });
      }

      socket.join(roomId);
      console.log(`[Room ${roomId}] ${username} joined. (Total: ${room.players.size}/4)`);

      room.broadcastState(); 
      callback({ success: true });
    });

    socket.on('SEND_SIGNAL', ({ roomId, signalType }) => {
      const room = activeRooms.get(roomId);
      if (room) {
        room.handleSignal(socket.id, signalType);
      }
    });

    socket.on('SUBMIT_VOTE', ({ roomId, decision }) => {
      const room = activeRooms.get(roomId);
      if (room) {
        room.handleVote(socket.id, decision);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[-] Disconnected: ${socket.id}`);
    });
  });
}

module.exports = initSocket;