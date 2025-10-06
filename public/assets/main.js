class Example extends Phaser.Scene
{
  preload () {
    this.load.setBaseURL('https://labs.phaser.io');

    this.load.image('sky', 'assets/skies/space3.png');
    this.load.image('logo', 'assets/sprites/phaser3-logo.png');
    this.load.image('red', 'assets/particles/red.png');
  }

  create () {
    this.add.image(400, 300, 'sky');

    const particles = this.add.particles(0, 0, 'red', {
      speed: 100,
      scale: { start: 1, end: 0 },
      blendMode: 'ADD'
    });

    const logo = this.physics.add.image(400, 100, 'logo');

    logo.setVelocity(100, 200);
    logo.setBounce(1, 1);
    logo.setCollideWorldBounds(true);

    particles.startFollow(logo);
  }
}

const config = {
  type: Phaser.AUTO,
  width: "100%",
  height: "100%",
  scene: Example,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 200 }
    }
  }
};

function createSocket(gameServer, listeners) {
  gameServer.socket = io();

  gameServer.socket.on('room:new-player', ({ player }) => {
    gameServer.state.room.players = gameServer.state.room.players.filter(p => p.id !== player.id);
    gameServer.state.room.players.push(player);
    console.log("onJoined");
    if (listeners.onJoined) {
      listeners.onJoined(player);
    }
  });

  gameServer.socket.on('room:player-disconnected', ({ player }) => {
    gameServer.state.room.players = gameServer.state.room.players.filter(p => p.id !== player.id);
    gameServer.state.room.players.push(player);
    console.log("onDisconnected");
    if (listeners.onDisconnected) {
      listeners.onDisconnected(player);
    }
  });

  gameServer.socket.on('room:player-left', ({ player }) => {
    gameServer.state.room.players = gameServer.state.room.players.filter(p => p.id !== player.id);
    console.log("onPlayerLeft");
    if (listeners.onPlayerLeft) {
      listeners.onPlayerLeft(player);
    }
  });

  gameServer.socket.on('room:host-changed', ({ player }) => {
    console.log("onHostChanged");
    if (listeners.onHostChanged) {
      listeners.onHostChanged(player);
    }
  })

  gameServer.socket.on('room:joined', ({ room, self }) => {
    gameServer.state.room = room;
    gameServer.state.self = self;
    console.log("onConnected");
    if (listeners.onConnected) {
      listeners.onConnected(gameServer);
    }
  });

  gameServer.socket.on('room:reconnected', (player) => {
    console.log("onReconnected");
    if (listeners.onReconnected) {
      listeners.onReconnected(player);
    }
  });

  let errors = ['room:full', 'room:already-connected', 'room:not-found'];
  for (let error of errors) {
    gameServer.socket.on(error, () => {
      console.log("onError");
      if (listeners.onError) {
        listeners.onError(error);
      }
    });
  }
}

function createGameServer(listeners) {
  let gameServer = {
    state: {},
  };

  gameServer.leave = () => {
    gameServer.socket.emit('room:leave');
  };

  createSocket(gameServer, listeners);
  return gameServer;
}

async function createRoom(pseudo) {
  let response = await fetch("/api/rooms", {
    method: 'POST',
    body: JSON.stringify({
      pseudo
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error(response);
    return null;
  }

  let { code } = await response.json();

  return code;
}

async function joinRoom(pseudo, code, created, listeners) {
  let gameServer = createGameServer(listeners);

  if (created) {
    gameServer.socket.emit('room:create', { code });
  } else {
    gameServer.socket.emit('room:join', { code, pseudo });
  }
}

async function reconnect(playerId, roomCode, listeners) {
  let gameServer = createGameServer(listeners);

  gameServer.socket.emit('room:reconnect', { playerId, roomCode });

  return gameServer;
}

function startGame(gameServer) {
  const game = new Phaser.Game(config);
}

