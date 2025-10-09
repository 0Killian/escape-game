class Enigma4Scene extends Phaser.Scene {
  constructor() {
    super("Enigma4");
  }

  /**
   * Initialize the scene with the server instance.
   * @param {GameServer} server - The server instance.
   */
  init(server) {
    this.server = server;
    this.server.listeners = {
      onNewMessage: this.server.listeners.onNewMessage,
      onSceneChanged: this.onSceneChanged.bind(this),
      onGameUpdate: this.onGameUpdate.bind(this),
    };
  }

  /**
   * Handles scene change event
   *
   * @param {GameServer} _server
   * @param {string} scene
   */
  onSceneChanged(_server, scene) {
    console.log("Enigma4: Scene changed to:", scene);
    
    if (scene !== "enigma4") {
      const sceneMap = {
        "main": "Main",
        "enigma1": "Enigma1",
        "enigma2": "Enigma2",
        "enigma3": "Enigma3",
        "enigma4": "Enigma4",
        "finale": "Finale"
      };
      
      const sceneKey = sceneMap[scene] || "Main";
      console.log("Enigma4: Starting scene:", sceneKey);
      this.scene.start(sceneKey, this.server);
    }
  }

  /**
   * Update the scene with the new game state.
   *
   * @param {GameServer} server - The server instance.
   * @param {Room} room - The room instance.
   * @param {GameEvent} event - The game event.
   */
  onGameUpdate(server, room, event) {
    // Toujours mettre à jour le timer
    this.updateTimer(room.timer);
  }

  /**
   * Updates the timer display
   *
   * @param {number} seconds
   */
  updateTimer(seconds) {
    if (this.timerText) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      this.timerText.setText(`⏱️ ${minutes}:${secs.toString().padStart(2, "0")}`);
    }
  }

  preload() {
    // TODO: Charger les ressources pour l'énigme 4
  }

  create() {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    // Background
    const bg = this.add.rectangle(
      0,
      0,
      screenWidth,
      screenHeight,
      0x1a1a2e
    );
    bg.setOrigin(0, 0);

    // Titre
    this.add.text(
      screenWidth / 2,
      50,
      "ÉNIGME 4 : La Bande-Son Manquante",
      {
        fontSize: "32px",
        fontFamily: "Arial",
        color: "#FFD700",
        stroke: "#000",
        strokeThickness: 4,
        align: "center"
      }
    ).setOrigin(0.5, 0);

    // Description
    this.add.text(
      screenWidth / 2,
      100,
      "Design sonore et impact émotionnel de la musique/bruitages",
      {
        fontSize: "18px",
        fontFamily: "Arial",
        color: "#ffffff",
        align: "center"
      }
    ).setOrigin(0.5, 0);

    // Timer en haut à droite
    this.timerText = this.add
      .text(screenWidth - 20, 20, "", {
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 0);

    // Initialiser le timer avec la valeur actuelle
    if (this.server.state.room) {
      this.updateTimer(this.server.state.room.timer);
    }

    // TODO: Implémenter l'énigme 4
    this.add.text(
      screenWidth / 2,
      screenHeight / 2,
      "Énigme en cours de développement...",
      {
        fontSize: "24px",
        color: "#ffffff",
      }
    ).setOrigin(0.5);
  }
}
