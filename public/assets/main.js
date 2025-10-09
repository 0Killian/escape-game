/**
 * @fileoverview Client-side game logic and Socket.IO connection management for the escape game.
 */

/**
 * Phaser game configuration object.
 * @type {Phaser.Types.Core.GameConfig}
 */
const config = {
  type: Phaser.AUTO,
  backgroundColor: "#222",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainScene, Enigma1Scene, Enigma2Scene],
};

/**
 * Creates and configures a Socket.IO connection with event listeners.
 * @param {GameServer} server - The game server object to attach the socket to
 */
function createSocket(server) {
  server.socket = io();

  server.socket.on("room:new-player", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id
    );
    server.state.room.players.push(player);
    if (server.listeners.onJoined) server.listeners.onJoined(server, player);
  });

  server.socket.on("room:player-disconnected", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id
    );
    server.state.room.players.push(player);
    if (server.listeners.onDisconnected)
      server.listeners.onDisconnected(server, player);
  });

  server.socket.on("room:player-left", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id
    );
    if (server.listeners.onPlayerLeft)
      server.listeners.onPlayerLeft(server, player);
  });

  server.socket.on("room:host-changed", ({ playerId }) => {
    server.state.room.players = server.state.room.players.map((p) => ({
      ...p,
      isHost: p.id === playerId,
    }));
    if (server.listeners.onHostChanged) {
      server.listeners.onHostChanged(server, playerId);
    }
  });

  server.socket.on("room:joined", ({ room, self }) => {
    server.state.room = room;
    server.state.self = self;
    console.log(server.state);
    if (server.listeners.onConnected) server.listeners.onConnected(server);
    if (server.state.room.started && server.listeners.onGameStarted) {
      server.listeners.onGameStarted(server);
    }
  });

  server.socket.on("room:reconnected", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id
    );
    server.state.room.players.push(player);
    if (server.listeners.onReconnected) {
      server.listeners.onReconnected(server, player);
    }
  });

  server.socket.on("game:started", () => {
    if (server.listeners.onGameStarted) {
      server.listeners.onGameStarted(server);
    }
  });

  server.socket.on("game:scene-changed", ({ scene }) => {
    if (server.listeners.onSceneChanged) {
      server.listeners.onSceneChanged(server, scene);
    }
  });

  server.socket.on("game:update", ({ room, event }) => {
    console.debug("game:update({ room: ", room, ", event: ", event, " })");
    server.state.room = room;
    
    // Mettre à jour aussi les informations du joueur actuel
    const currentPlayer = room.players.find(p => p.id === server.state.self.id);
    if (currentPlayer) {
      server.state.self = currentPlayer;
    }
    
    if (server.listeners.onGameUpdate) {
      server.listeners.onGameUpdate(server, room, event);
    }
  });

  const rawErrors = [
    "error:full",
    "error:not-found",
    "error:not-authorized",
    "error:invalid-scene-change",
  ];

  for (let code of rawErrors) {
    server.socket.on(code, () => {
      if (server.listeners.onError) server.listeners.onError(server, code);
    });
  }

  server.socket.on("chat:new-message", ({ message }) => {
    if (server.listeners.onNewMessage)
      server.listeners.onNewMessage(server, message);
  });
}

/**
 * Récupère l'historique des messages d'une room
 * @param {string} roomCode
 * @returns {Promise<Array>} messages
 */
async function fetchRoomMessages(roomCode) {
  const res = await fetch(`/api/rooms/${roomCode}/messages`);
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Envoie un message dans la room via Socket.IO
 * @param {Object} server
 * @param {string} text
 */
function sendMessage(server, text) {
  if (!server.state || !server.state.room || !server.state.self) return;
  server.socket.emit("chat:send-message", {
    text: text.slice(0, 500),
  });
}

/**
 * Creates a game server object with Socket.IO connection.
 * @param {SocketListeners} listeners - Object containing event listener callbacks
 * @returns {GameServer} The game server object
 */
function createGameServer(listeners) {
  /** @type {GameServer} */
  let gameServer = {
    state: {
      room: null,
      self: null,
    },
    listeners,
    socket: null,

    start() {
      gameServer.socket.emit("game:start");
    },
    changeScene(scene) {
      gameServer.socket.emit("game:change-scene", { scene });
    },
    leave() {
      gameServer.socket.emit("room:leave");
    },

    enigma1: {
      move(moves) {
        gameServer.socket.emit("enigma1:move", moves);
      },
      swapSlots(slot1, slot2) {
        gameServer.socket.emit("enigma1:swap-slots", {
          slot1,
          slot2,
        });
      },
      submit() {
        gameServer.socket.emit("enigma1:submit");
      },
    },
  };

  createSocket(gameServer);
  return gameServer;
}

/**
 * Creates a new game room on the server.
 * @param {string} pseudo - The player's username
 * @returns {Promise<string|null>} The room code if successful, null otherwise
 */
async function createRoom(pseudo) {
  let response = await fetch("/api/rooms", {
    method: "POST",
    body: JSON.stringify({
      pseudo,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(response);
    return null;
  }

  let { code } = await response.json();

  return code;
}

/**
 * Joins an existing game room.
 * @param {string} pseudo - The player's username
 * @param {string} code - The room code to join
 * @param {SocketListeners} listeners - Object containing event listener callbacks
 * @returns {Promise<void>}
 */
async function joinRoom(pseudo, code, listeners) {
  const gs = createGameServer(listeners);
  gs.socket.emit("room:join", { code, pseudo });
}

/**
 * Starts the Phaser game instance.
 * @param {GameServer} server - The game server object
 * @param {string} [startScene] - The scene to start on (default: "Main")
 */
function startGame(server, startScene = "Main") {
  const config = {
    type: Phaser.AUTO,
    backgroundColor: "#222",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MainScene, Enigma1Scene, Enigma2Scene, Enigma3Scene, Enigma4Scene],
  };

  const game = new Phaser.Game(config);
  
  // Mapper le nom de scène côté serveur vers le nom de scène Phaser
  const sceneMap = {
    "main": "Main",
    "enigma1": "Enigma1",
    "enigma2": "Enigma2",
    "enigma3": "Enigma3",
    "enigma4": "Enigma4",
    "finale": "Finale"
  };
  
  const sceneKey = sceneMap[startScene] || startScene;
  game.scene.start(sceneKey, server);
}
