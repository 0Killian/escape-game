// Génération code salle (A-Z, 0-9, 6 caractères)
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let code = '';

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

export default {
  registerRoutes: (prisma, app, io) => {
    // REST: Créer une salle
    app.post('/api/rooms', async (req, res) => {
      const { pseudo } = req.body;
      console.log(pseudo);
      const code = generateRoomCode();

      const room = await prisma.room.create({
        data: { code }
      });

      const player = await prisma.player.create({
        data: {
          pseudo,
          room: { connect: { id: room.id } },
          isHost: true,
          currentScene: 'main'
        }
      });

      await prisma.room.update({
        where: { id: room.id },
        data: { hostPlayerId: player.id }
      });

      res.json({ code });
    });

    // REST: Vérifier existence salle
    app.get('/api/rooms/:code', async (req, res) => {
      const { code } = req.params;
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return res.status(404).json({ error: 'Salle inexistante' });
      res.json({ ok: true });
    });

    // In-memory cache pour timers
    const roomTimers = {};
    const playerTimers = {};

    // Socket.io
    io.on('connection', (socket) => {
      let currentRoom = null;
      let currentPlayer = null;

      socket.on('room:create', async (params) => {
        console.log(params);
        let code = params.code;
        let room = await prisma.room.findUnique({ where: { code }, include: { players: true } });

        if (!room) return socket.emit('room:not-found');
        if (room.players.length != 1) return socket.emit('room:already-created');

        currentRoom = room.code;
        currentPlayer = room.players[0].id;

        socket.join(room.code);
        socket.emit('room:joined', { room, self: room.players[0] });
      })

      socket.on('room:join', async ({ code, pseudo }) => {
        let room = await prisma.room.findUnique({ where: { code }, include: { players: true } });

        if (!room) return socket.emit('room:not-found');
        if (room.players.length >= 2) return socket.emit('room:full');

        const player = await prisma.player.create({
          data: {
            pseudo,
            room: { connect: { id: room.id } },
            isHost: false,
            currentScene: 'main',
          }
        });

        currentRoom = room.code;
        currentPlayer = player.id;
        socket.join(room.code);

        // Recharge la room pour inclure le nouveau joueur
        room = await prisma.room.findUnique({ where: { code }, include: { players: true } });
        io.to(room.code).emit('room:new-player', { player });
        socket.emit('room:joined', { room, self: player });
      });

      socket.on('room:reconnect', async ({ playerId, roomCode }) => {
        let player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player || !player.roomId) return socket.emit('room:not-found');

        const room = await prisma.room.findUnique({ where: { code: roomCode }, include: { players: true } });
        if (!room) return socket.emit('room:not-found');

        currentRoom = room.code;
        currentPlayer = player.id;

        await prisma.player.update({ where: { id: player.id }, data: { connected: true, lastSeenAt: new Date() } });
        player = await prisma.player.findUnique({ where: { id: playerId } });
        socket.join(room.code);

        io.to(room.code).emit('room:reconnected', { player });
        socket.emit('room:joined', { room, self: player });
      });

      socket.on('room:leave', async () => {
        if (!currentPlayer) return;
        await removePlayer(currentPlayer, currentRoom);
      });

      socket.on('disconnect', async () => {
        if (!currentPlayer) return;
        await prisma.player.update({ where: { id: currentPlayer }, data: { connected: false } });
        let player = await prisma.player.findUnique({ where: { id: currentPlayer } });

        io.to(player.room.code).emit('room:player-disconnected', { player })

        playerTimers[currentPlayer] = setTimeout(async () => {
          await removePlayer(currentPlayer, currentRoom);
        }, 60000);
      });

      async function removePlayer(playerId, roomCode) {
        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player) return;

        const room = await prisma.room.findUnique({ where: { code: roomCode }, include: { players: true } });

        // Si le joueur qui part est host, transférer avant suppression
        if (room && room.players.length === 2 && player.isHost) {
          // Trouver le joueur restant
          const newHost = room.players.find(p => p.id !== playerId);
          if (newHost) {
            await prisma.player.update({ where: { id: newHost.id }, data: { isHost: true } });
            await prisma.room.update({ where: { id: room.id }, data: { hostPlayerId: newHost.id } });
            io.to(room.code).emit('room:host-changed', { playerId: newHost.id });
          }
        }

        await prisma.player.delete({ where: { id: playerId } });

        // Recharge la room après suppression
        const updatedRoom = await prisma.room.findUnique({ where: { code: roomCode }, include: { players: true } });
        io.to(roomCode).emit('room:player-left', { player });

        // Suppression salle si vide
        if (updatedRoom && updatedRoom.players.length === 0) {
          roomTimers[roomCode] = setTimeout(async () => {
            await prisma.room.delete({ where: { code: roomCode } });
          }, 60000);
        }
      }
    });
  }
};
