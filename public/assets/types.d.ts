declare global {
  interface GameEvent {
    kind:
      | "enigma1:submit-result"
      | "enigma1:move"
      | "enigma1:swap-slots"
      | "enigma3:update"
      | "enigma3:submit-result"
      | "game:timer";
    data: any;
  }
  /**
   * Message object representing a chat message.
   */
  interface Message {
    id: string;
    author: Player;
    text: string;
    createdAt: number;
  }

  /**
   * Player object representing a participant in the game.
   */
  interface Player {
    id: string;
    pseudo: string;
    isHost: boolean;
    connected: boolean;
    currentScene: string;
  }

  /**
   * Room object storing the state of the game.
   */
  interface Room {
    /** Unique code for the room */
    code: string;

    /** Whether the game has started */
    started: boolean;

    /** Number of seconds remaining */
    timer: number;

    /** Array of players in the room */
    players: Array<Player>;

    /** Enigma 1 state */
    Enigma1: {
      storyboards: Array<{
        name: string;
        position: {
          x: number;
          y: number;
        };
        index: number;
      }>;
      completed: boolean;
    };

    /** Enigma 2 state */
    Enigma2: {
      photos: Array<string>;
      completed: boolean;
    };

    /** Enigma 3 state */
    Enigma3: {
      roles: Array<string>;
      completed: boolean;
    };

    /** Enigma 4 state */
    Enigma4: {
      ambiance?: string;
      completed: boolean;
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

    /** Event listeners */
    listeners: SocketListeners;

    /** Function to start the game */
    start(): void;

    /** Function to request a scene change */
    changeScene(scene: string): void;

    /** Function to leave the current room */
    leave(): void;

    /** Functions to manage enigma 1 */
    enigma1: {
      /** Move an image to a specific position */
      move(key: number, x: number, y: number): void;
      /** Swap the slots of two images */
      swapSlots(key1: string, key2: string, slot1: number, slot2: number): void;
      /** Submit the current order */
      submit(): void;
    };
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

    /** Called when the game starts */
    onGameStarted?(server: GameServer): void;

    /** Called when the server requests a scene changes */
    onSceneChanged?(server: GameServer, scene: string): void;

    /** Called when the server updates the game state */
    onGameUpdate?(server: GameServer, room: string, event: GameEvent): void;

    /** Called when another player sends a message */
    onNewMessage?(server: GameServer, message: string): void;
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
