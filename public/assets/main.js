/* global Phaser, io */
/**
 * @fileoverview Client-side game logic and Socket.IO connection management for the escape game.
 */

/**
 * Example Phaser scene demonstrating basic game setup.
 * @extends Phaser.Scene
 */
class Main extends Phaser.Scene {
  constructor() {
    super("Main");
  }
  /**
   * Preloads game assets from external source.
   */
  preload() {
    this.load.image("hallway", "assets/hallway.webp");
    this.load.image("door-red", "assets/door-red.png");
    this.load.image("door-green", "assets/door-green.png");
  }

  create() {
    const startX = 150;
    const startY = 200;
    const spacing = 200;

    for (let i = 0; i < 4; i++) {
      // Crée un conteneur
      const container = this.add.container(startX + i * spacing, startY);

      // Ajoute l'image du fond
      const bg = this.add.image(0, 0, "hallway").setScale(0.5);

      // Ajoute l'image du dessus (cliquable)
      const fg = this.add.image(0, 0, "").setScale(0.5);

      // On rend l'image du dessus interactive
      fg.setInteractive({ useHandCursor: true });

      // Action au clic
      fg.on("pointerdown", () => {
        console.log(`Image ${i + 1} cliquée !`);
        // Exemple : petite animation
        this.tweens.add({
          targets: fg,
          scale: 0.6,
          yoyo: true,
          duration: 150,
        });
      });

      // Ajoute les images dans le container
      container.add([bg, fg]);
    }
  }
}

/**
 * Phaser game configuration object.
 * @type {Phaser.Types.Core.GameConfig}
 */
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE, // important !
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: "100%",
    height: "100%",
  },
  scene: Main,
};

/**
 * Creates and configures a Socket.IO connection with event listeners.
 * @param {GameServer} server - The game server object to attach the socket to
 * @param {SocketListeners} listeners - Object containing event listener callbacks
 */
function createSocket(server, listeners) {
  server.socket = io();

  server.socket.on("room:new-player", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id
    );
    server.state.room.players.push(player);
    if (listeners.onJoined) listeners.onJoined(server, player);
  });

  server.socket.on("room:player-disconnected", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id
    );
    server.state.room.players.push(player);
    if (listeners.onDisconnected) listeners.onDisconnected(server, player);
  });

  server.socket.on("room:player-left", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id
    );
    if (listeners.onPlayerLeft) listeners.onPlayerLeft(server, player);
  });

  server.socket.on("room:host-changed", ({ playerId }) => {
    server.state.room.players = server.state.room.players.map((p) => ({
      ...p,
      isHost: p.id === playerId,
    }));
    if (listeners.onHostChanged) {
      listeners.onHostChanged(server, playerId);
    }
  });

  server.socket.on("room:joined", ({ room, self }) => {
    server.state.room = room;
    server.state.self = self;
    if (listeners.onConnected) listeners.onConnected(server);
  });

  server.socket.on("room:reconnected", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id
    );
    server.state.room.players.push(player);
    if (listeners.onReconnected) {
      listeners.onReconnected(server, player);
    }
  });

  server.socket.on("game:started", () => {
    if (listeners.onGameStarted) {
      listeners.onGameStarted(server);
    }
  });

  server.socket.on("game:scene-changed", ({ scene }) => {
    if (listeners.onSceneChanged) {
      listeners.onSceneChanged(server, scene);
    }
  });

  server.socket.on("game:update", ({ scene }) => {
    if (listeners.onGameUpdate) {
      listeners.onGameUpdate(server, scene);
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
      if (listeners.onError) listeners.onError(server, code);
    });
  }

  server.socket.on("chat:new-message", ({ message }) => {
    if (listeners.onNewMessage) listeners.onNewMessage(server, message);
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
    socket: null,

    start() {
      gameServer.socket.emit("game:start");
    },
    changeScene(scene) {
      gameServer.socket.emit("game:scene-changed", { scene });
    },
    leave() {
      gameServer.socket.emit("room:leave");
    },
  };

  createSocket(gameServer, listeners);
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
 */
function startGame(server) {
  server.start();
  new Phaser.Game(config);
}
