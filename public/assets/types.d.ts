declare global {
  /**
   * Player object representing a participant in the game.
   */
  interface Player {
    id: string;
    pseudo: string;
    isHost: boolean;
    connected: boolean;
  }

  /**
   * Room object storing the state of the game.
   */
  interface Room {
    /** Number of seconds remaining */
    timer: number;

    /** Array of players in the room */
    players: Array<Player>;

    /** Enigma 1 state */
    enigma1: {
      storyboards: Array<string>;
    };

    /** Enigma 2 state */
    enigma2: {
      photos: Array<string>;
    };

    /** Enigma 3 state */
    enigma3: {
      roles: Array<string>;
    };

    /** Enigma 4 state */
    enigma4: {
      ambiance?: string;
    };
  }

  /**
   * Game server object that manages Socket.IO connection and game state.
   */
  interface GameServer {
    /** Socket.IO client instance */
    socket: any;

    /** Game state object */
    state: {
      /** Current room data */
      room: Room;

      /** Current player data */
      self: Player;
    };

    /** Function to leave the current room */
    leave(): void;
  }

  /**
   * Socket event listeners for room management.
   */
  interface SocketListeners {
    /** Called when a new player joins */
    onJoined?(server: GameServer, player: any): void;

    /** Called when a player disconnects */
    onDisconnected?(server: GameServer, player: any): void;

    /** Called when a player leaves */
    onPlayerLeft?(server: GameServer, player: any): void;

    /** Called when the host changes */
    onHostChanged?(server: GameServer, player: any): void;

    /** Called when successfully connected to a room */
    onConnected?(server: GameServer): void;

    /** Called when a player reconnects */
    onReconnected?(server: GameServer, player: any): void;

    /** Called when an error occurs */
    onError?(server: GameServer, error: string): void;
  }

  // Global functions
  function createGameServer(listeners: SocketListeners): GameServer;
  function createRoom(pseudo: string): Promise<string | null>;
  function joinRoom(
    pseudo: string,
    code: string,
    listeners: SocketListeners,
  ): Promise<void>;
  function startGame(gameServer: GameServer): void;
}

export {};
