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
    console.log("onJoined");
    if (listeners.onJoined) {
      listeners.onJoined(server, player);
    }
  });

  server.socket.on("room:player-disconnected", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id,
    );
    server.state.room.players.push(player);
    console.log("onDisconnected");
    if (listeners.onDisconnected) {
      listeners.onDisconnected(server, player);
    }
  });

  server.socket.on("room:player-left", ({ player }) => {
    server.state.room.players = server.state.room.players.filter(
      (p) => p.id !== player.id,
    );
    console.log("onPlayerLeft");
    if (listeners.onPlayerLeft) {
      listeners.onPlayerLeft(server, player);
    }
  });

  server.socket.on("room:host-changed", ({ player }) => {
    console.log("onHostChanged");
    if (listeners.onHostChanged) {
      listeners.onHostChanged(server, player);
    }
  });

  server.socket.on("room:joined", ({ room, self }) => {
    server.state.room = room;
    server.state.self = self;
    console.log("onConnected");
    if (listeners.onConnected) {
      listeners.onConnected(server);
    }
  });

  server.socket.on("room:reconnected", (player) => {
    console.log("onReconnected");
    if (listeners.onReconnected) {
      listeners.onReconnected(server, player);
    }
  });

  let errors = ["room:full", "room:already-connected", "room:not-found"];
  for (let error of errors) {
    server.socket.on(error, () => {
      console.log("onError");
      if (listeners.onError) {
        listeners.onError(server, error);
      }
    });
  }
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
    leave: () => {
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
  let gameServer = createGameServer(listeners);

  gameServer.socket.emit("room:join", { code, pseudo });
}

/**
 * Starts the Phaser game instance.
 * @param {GameServer} gameServer - The game server object
 */
function startGame(gameServer) {
  const game = new Phaser.Game(config);
}
