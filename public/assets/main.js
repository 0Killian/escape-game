/* global Phaser, io */
/**
 * @fileoverview Client-side game logic and Socket.IO connection management for the escape game.
 */

/**
 * Example Phaser scene demonstrating basic game setup.
 * @extends Phaser.Scene
 */
class Example extends Phaser.Scene {
  /**
   * Preloads game assets from external source.
   */
  preload() {
    this.load.setBaseURL("https://labs.phaser.io");

    this.load.image("sky", "assets/skies/space3.png");
    this.load.image("logo", "assets/sprites/phaser3-logo.png");
    this.load.image("red", "assets/particles/red.png");
  }

  /**
   * Creates the game scene with physics objects and particle effects.
   */
  create() {
    this.add.image(400, 300, "sky");

    const particles = this.add.particles(0, 0, "red", {
      speed: 100,
      scale: { start: 1, end: 0 },
      blendMode: "ADD",
    });

    const logo = this.physics.add.image(400, 100, "logo");

    logo.setVelocity(100, 200);
    logo.setBounce(1, 1);
    logo.setCollideWorldBounds(true);

    particles.startFollow(logo);
  }
}

/**
 * Phaser game configuration object.
 * @type {Phaser.Types.Core.GameConfig}
 */
const config = {
  type: Phaser.AUTO,
  width: "100%",
  height: "100%",
  scene: Example,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 200 },
    },
  },
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
      (p) => p.id !== player.id,
    );
    server.state.room.players.push(player);
    if (listeners.onJoined) listeners.onJoined(server, player);
  });

  server.socket.on("room:player-disconnected", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id,
    );
    server.state.room.players.push(player);
    if (listeners.onDisconnected) listeners.onDisconnected(server, player);
  });

  server.socket.on("room:player-left", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id,
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
      (p) => p.id !== player.id,
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

  server.socket.on("chat:new-message", ({ msg }) => {
    if (listeners.onNewMessage) listeners.onNewMessage(server, msg);
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
