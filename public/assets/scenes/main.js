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
      onError: this.onError.bind(this),
      onNewMessage: this.server.listeners.onNewMessage,
    };

    // Si le joueur n'est pas sur la scène "main", le rediriger vers sa scène actuelle
    console.log("Current scene:", this.server.state.self.currentScene);
    if (this.server.state.self.currentScene !== "main") {
      this.onSceneChanged(this.server, this.server.state.self.currentScene);
    }
  }

  /**
   * Handles error event
   *
   * @param {string} error
   */
  onError(error) {
    console.error(error);
  }

  /**
   * Handles scene change event
   *
   * @param {GameServer} _server
   * @param {string} scene
   */
  onSceneChanged(_server, scene) {
    this.scale.removeAllListeners("resize");
    this.input.removeAllListeners("pointerdown");
    this.scene.start(this.getSceneKey(scene), this.server);
  }

  /**
   * Handles game state update event.
   *
   * @param {GameServer} server
   * @param {Room} room
   * @param {GameEvent} event
   */
  onUpdate(server, room, event) {
    // Mettre à jour l'état de la room dans le serveur
    server.state.room = room;

    // Only update what's necessary based on the event
    switch (event.kind) {
      case "game:timer":
        this.updateTimer(room.timer);
        break;
      case "enigma1:submit":
      case "enigma2:submit-result":
      case "enigma3:submit-result":
        // Update doors when enigmas are completed
        this.updateDoors(room);
        break;
      default:
        // For any other event, do nothing
        break;
    }
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
      this.timerText.setText(
        `⏱️ ${minutes}:${secs.toString().padStart(2, "0")}`,
      );
    }
  }

  /**
   * Updates the door states based on the room's state
   *
   * @param {Room} room
   */
  updateDoors(room) {
    // Update EXIT door if all enigmas are completed
    if (this.exitDoor) {
      const allCompleted =
        room.Enigma1.completed &&
        room.Enigma2.completed &&
        room.Enigma3.completed;
      const doorImgType = allCompleted ? "door-green" : "door-red";
      this.exitDoor.img.setTexture(doorImgType);
    }
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
      0x1a1a2e,
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
        this.scale.width * (hallwayHeight / hallwayWidth),
      );

    // Calculate hallway floor position for door anchoring
    const hallwayTop = this.scale.height / 2 - realHallwayHeight / 2;
    const hallwayBottom = this.scale.height / 2 + realHallwayHeight / 2;

    // Scale doors relative to hallway size (doors should be about 1/6 of hallway height)
    const doorScaledWidth = realHallwayWidth / 7;
    const doorScaledHeight = realHallwayHeight / 1.6;
    const doorScale = doorScaledHeight / doorHeight;

    const doorFloorY = hallwayBottom - hallwayBottom * 0.03; // Anchor doors to hallway floor

    // Les 3 portes d'énigmes + 1 porte EXIT - positioned relative to hallway
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
        label: "EXIT",
        scene: null,
        key: "exit",
        isExit: true,
      },
    ];

    doors.forEach((door) => {
      const container = this.add.container(door.x, door.y);

      // Porte (verte si complétée, rouge sinon)
      let doorImgType;
      let clickHandler;

      if (door.isExit) {
        // EXIT door: check if all enigmas are completed
        const allCompleted =
          this.server.state.room.Enigma1.completed &&
          this.server.state.room.Enigma2.completed &&
          this.server.state.room.Enigma3.completed;
        doorImgType = allCompleted ? "door-green" : "door-red";

        clickHandler = () => {
          // Re-check completion status at click time
          const currentlyCompleted =
            this.server.state.room.Enigma1.completed &&
            this.server.state.room.Enigma2.completed &&
            this.server.state.room.Enigma3.completed;

          if (currentlyCompleted) {
            this.showCongratulatoryModal();
          }
        };
      } else {
        // Regular enigma door
        doorImgType = this.server.state.room[door.scene].completed
          ? "door-green"
          : "door-red";

        clickHandler = () => {
          this.server.changeScene(door.key);
        };
      }

      const doorImg = this.add
        .image(0, 0, doorImgType)
        .setDisplaySize(doorScaledWidth, doorScaledHeight)
        .setOrigin(0.5, 1);
      doorImg.setInteractive({ useHandCursor: true });

      // Store reference to door for updates
      if (door.isExit) {
        this.exitDoor = { img: doorImg, door };
      }

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
      doorImg.on("pointerdown", clickHandler);
    });

    // Titre et sous-titre (en dehors de la boucle)
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
      .setOrigin(0.5, 2.5);

    // Timer (en dehors de la boucle)
    this.timerText = this.add
      .text(this.scale.width - 20, 20, "", {
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

    this.scale.on("resize", () => {
      this.scene.restart();
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

  /**
   * Shows the congratulatory modal when all enigmas are completed
   */
  showCongratulatoryModal() {
    const modal = document.getElementById("exitModal");
    if (modal) {
      modal.style.display = "flex";
    }
  }
}
