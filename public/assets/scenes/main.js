class MainScene extends Phaser.Scene {
  constructor() {
    super("Main");
  }

  /**
   * Initializes the scene
   *
   * @param {GameServer} server
   */
  init(server) {
    this.server = server;
    this.server.listeners = {
      onSceneChanged: this.onSceneChanged.bind(this),
      onGameUpdate: this.onUpdate.bind(this),
    };

    if (this.server.state.self.currentScene !== "main") {
      this.onSceneChanged(this.server, this.server.state.self.currentScene);
    }
  }

  /**
   * Handles scene change event
   *
   * @param {GameServer} _server
   * @param {string} scene
   */
  onSceneChanged(_server, scene) {
    console.log("Scene changed to:", scene);
    this.scene.start(this.getSceneKey(scene), this.server);
  }

  /**
   * Handles game state update event.
   *
   * @param {GameServer} _server
   * @param {Room} room
   */
  onUpdate(_server, room) {
    this.updateTimer(room.timer);
    this.updateDoors(room);
  }

  /**
   * Updates the timer display
   *
   * @param {number} seconds
   */
  updateTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText.setText(`${minutes}:${secs.toString().padStart(2, "0")}`);
  }

  /**
   * Updates the door states based on the room's state
   *
   * @param {Room} room
   */
  updateDoors(room) {
    // TODO: Mettre à jour les portes selon l'état des énigmes
  }

  preload() {
    this.load.image("hallway", "/assets/images/hallway.png");
    this.load.image("door-green", "/assets/images/door-green.png");
    this.load.image("door-red", "/assets/images/door-red.png");
  }

  create() {
    // Background
    const bg = this.add.rectangle(
      0,
      0,
      this.scale.width,
      this.scale.height,
      0x1a1a2e
    );
    bg.setOrigin(0, 0);

    const hallwayWidth = this.textures.get("hallway").get(0).width;
    const hallwayHeight = this.textures.get("hallway").get(0).height;

    const doorWidth = this.textures.get("door-green").get(0).width;
    const doorHeight = this.textures.get("door-green").get(0).height;
    const doorAspectRatio = doorWidth / doorHeight;

    // Let the hallway fit in the screen, resizing the height or the width depending on the aspect ratio
    // The hallway must take the full width of the screen and adjust its height accordingly
    let realHallwayWidth = this.scale.width;
    let realHallwayHeight = realHallwayWidth * (hallwayHeight / hallwayWidth);

    const hallway = this.add
      .image(0, this.scale.height / 2, "hallway")
      .setOrigin(0, 0.5)
      .setDisplaySize(
        this.scale.width,
        this.scale.width * (hallwayHeight / hallwayWidth)
      );

    // Calculate hallway floor position for door anchoring
    const hallwayTop = this.scale.height / 2 - realHallwayHeight / 2;
    const hallwayBottom = this.scale.height / 2 + realHallwayHeight / 2;

    // Scale doors relative to hallway size (doors should be about 1/6 of hallway height)
    const doorScaledWidth = realHallwayWidth / 7;
    const doorScaledHeight = realHallwayHeight / 1.6;
    const doorScale = doorScaledHeight / doorHeight;

    const doorFloorY = hallwayBottom - hallwayBottom * 0.03; // Anchor doors to hallway floor

    // Les 4 portes d'énigmes - positioned relative to hallway
    const doors = [
      {
        x: this.scale.width * (1 / 8),
        y: doorFloorY,
        label: "Storyboard",
        scene: "Enigma1",
        key: "enigma1",
      },
      {
        x: this.scale.width * (13 / 32),
        y: doorFloorY,
        label: "Lumière",
        scene: "Enigma2",
        key: "enigma2",
      },
      {
        x: this.scale.width * (19 / 32),
        y: doorFloorY,
        label: "Casting",
        scene: "Enigma3",
        key: "enigma3",
      },
      {
        x: this.scale.width * (7 / 8),
        y: doorFloorY,
        label: "Bande-son",
        scene: "Enigma4",
        key: "enigma4",
      },
    ];

    doors.forEach((door) => {
      const container = this.add.container(door.x, door.y);

      // Porte (verte si complétée, rouge sinon)
      const doorImgType = this.server.state.room[door.scene].completed
        ? "door-green"
        : "door-red";
      const doorImg = this.add
        .image(0, 0, doorImgType)
        .setDisplaySize(doorScaledWidth, doorScaledHeight)
        .setOrigin(0.5, 1);
      doorImg.setInteractive({ useHandCursor: true });

      // Label (position relative to door size)
      const labelOffsetY = -(doorScaledHeight * 2.5) / 2;
      const labelFontSize = Math.max(16, doorScaledHeight / 8);
      const label = this.add
        .text(0, labelOffsetY, door.label, {
          fontSize: `${labelFontSize}px`,
          color: "#ffffff",
          backgroundColor: "#000000",
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0.5, 0);

      container.add([doorImg, label]);

      // Click handler
      doorImg.on("pointerdown", () => {
        this.server.changeScene(door.key);
      });

      this.add
        .text(this.scale.width / 2, 10, "STUDIO 404", {
          fontSize: "64px",
          fontStyle: "bold",
          color: "#ffcc00",
        })
        .setOrigin(0.5, 0.0);

      this.add
        .text(this.scale.width / 2, 180, "Choisissez une salle", {
          fontSize: "28px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      // Timer
      this.timerText = this.add
        .text(this.scale.width - 20, 20, "", {
          fontSize: "24px",
          color: "#ffffff",
        })
        .setOrigin(1, 0);

      this.scale.on("resize", () => {
        this.scene.restart();
      });
    });
  }

  /**
   * Maps the scene key to the corresponding scene name
   *
   * @param {string} scene
   * @returns
   */
  getSceneKey(scene) {
    const mapping = {
      enigma1: "Enigma1",
      enigma2: "Enigma2",
      enigma3: "Enigma3",
      enigma4: "Enigma4",
    };
    return mapping[scene] || "Main";
  }
}
