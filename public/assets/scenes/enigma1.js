class Enigma1Scene extends Phaser.Scene {
  constructor() {
    super("Enigma1");
    this.images = {};
    this.slots = [];
    this.keys = ["image1", "image2", "image3", "image4", "image5", "image6"];
  }

  /**
   * Initialize the scene with the server instance.
   * @param {GameServer} server - The server instance.
   */
  init(server) {
    this.server = server;
    this.server.listeners = {
      onNewMessage: this.server.listeners.onNewMessage,
    };
  }

  preload() {
    this.keys.forEach((key) =>
      this.load.image(key, "assets/images/storyboard/" + key + ".png"),
    );
  }

  /**
   * Changes the scene to the next scene.
   *
   * @param {GameServer} server - The server instance.
   * @param {string} scene - The name of the next scene.
   */
  onSceneChanged(server, scene) {
    this.scale.removeAllListeners("resize");
    this.scale.removeAllListeners("drag");
    this.input.removeAllListeners("dragend");
    this.input.removeAllListeners("pointerdown");
    this.scene.start(this.getSceneKey(scene));
  }

  /**
   * Update the scene with the new game state.
   *
   * @param {GameServer} server - The server instance.
   * @param {Room} room - The room instance.
   * @param {GameEvent} event - The game event.
   */
  onGameUpdate(server, room, event) {
    switch (event.kind) {
      case "enigma1:submit-result":
        if (room.Enigma1.completed) {
          alert("🎉 Bravo ! Les images sont dans le bon ordre !");
        } else {
          alert("😅 Ce n'est pas encore le bon ordre, continue !");
        }
        break;

      case "enigma1:move": {
        for (const move of /** @type {Array<MoveEvent>} */ (event.data)) {
          const key = move.key;
          if (move.x === null || move.y === null) {
            this.images[key].x = this.slots[this.images[key].getData("slot")].x;
            this.images[key].y = this.slots[this.images[key].getData("slot")].y;
          } else {
            const { xScreen, yScreen } = this.toScreen(move.x, move.y);
            this.images[key].x = xScreen;
            this.images[key].y = yScreen;
          }
        }
        break;
      }

      case "enigma1:swap-slots": {
        /** @type {SwapSlotsEvent} */
        // @ts-ignore - event.data is SwapSlotsEvent for this case
        const swapData = event.data;

        const key1 = swapData.slot1;
        const key2 = swapData.slot2;
        const slot1 = this.images[key1].getData("slot");
        const slot2 = this.images[key2].getData("slot");
        this.images[key1].setData("slot", slot2);
        this.images[key2].setData("slot", slot1);
        break;
      }

      case "game:timer":
        // TODO: TIMER
        break;
    }
  }

  create() {
    const numImages = this.keys.length;
    const imageWidth = 250;
    const imageHeight = 150;
    const spacingX = 20;
    const yImages = this.cameras.main.centerY;
    const yNumbers = yImages - imageHeight / 2 - 30;

    // Calculer largeur totale pour centrer les slots
    const totalWidth = numImages * imageWidth + (numImages - 1) * spacingX;
    const startX = this.cameras.main.centerX - totalWidth / 2 + imageWidth / 2;

    // Créer les slots et les numéros
    for (let i = 0; i < numImages; i++) {
      const x = startX + i * (imageWidth + spacingX);

      // Slot visible
      let slot = this.add
        .rectangle(x, yImages, imageWidth, imageHeight, 0xffffff, 0.2)
        .setStrokeStyle(2, 0x000000);

      // @ts-ignore
      slot.correctIndex = i;
      this.slots.push(slot);

      // Numéro au-dessus
      this.add
        .text(x, yNumbers, (i + 1).toString(), {
          fontSize: "32px",
          color: "#000",
        })
        .setOrigin(0.5, 0.5);
    }

    console.log(this.server.state);

    // Placer les images dans les slots
    this.server.state.room.Enigma1.storyboards.forEach((storyboard) => {
      /** @type Phaser.GameObjects.Rectangle */
      const slot = this.slots[storyboard.index];

      let xScreen, yScreen;
      if (storyboard.position.x === null || storyboard.position.y === null) {
        // Initialize to slot position (already in screen space)
        xScreen = slot.x;
        yScreen = slot.y;
      } else {
        // Use stored position (in NDC, convert to screen)
        const result = this.toScreen(
          storyboard.position.x,
          storyboard.position.y,
        );
        xScreen = result.xScreen;
        yScreen = result.yScreen;
      }

      let img = this.add
        .image(xScreen, yScreen, storyboard.name)
        .setInteractive();

      img.setDisplaySize(imageWidth, imageHeight);
      img.setData("slot", storyboard.index);
      img.setData("key", storyboard.name);

      this.input.setDraggable(img);
      this.images[storyboard.name] = img;
    });

    // Drag & Drop
    this.input.on(
      "drag",
      (
        /** @type Phaser.Input.Pointer */ _pointer,
        /** @type Phaser.GameObjects.Image */ gameObject,
        /** @type number */ dragX,
        /** @type number */ dragY,
      ) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
        let { xNDC, yNDC } = this.toNDC(dragX, dragY);
        this.server.enigma1.move([
          { key: gameObject.getData("key"), x: xNDC, y: yNDC },
        ]);
      },
    );

    this.input.on(
      "dragend",
      (
        /** @type Phaser.Input.Pointer */ _pointer,
        /** @type Phaser.GameObjects.Image */ draggedImg,
      ) => {
        // Trouver le slot le plus proche
        let closestSlotIndex = this.slots
          .map((_, index) => index)
          .reduce((prev, curr) => {
            return Math.abs(this.slots[curr].x - draggedImg.x) <
              Math.abs(this.slots[prev].x - draggedImg.x)
              ? curr
              : prev;
          });

        const currentSlotIndex = draggedImg.getData("slot");

        // If dropped on the same slot, move back to slot position
        if (closestSlotIndex === currentSlotIndex) {
          this.server.enigma1.move([
            { key: draggedImg.getData("key"), x: null, y: null },
          ]);
          return;
        }

        // Find the image in the closest slot to swap with
        let otherImg = null;
        for (let key in this.images) {
          if (
            this.images[key] !== draggedImg &&
            this.images[key].getData("slot") === closestSlotIndex
          ) {
            otherImg = this.images[key];
            break;
          }
        }

        // Swap slots
        this.server.enigma1.swapSlots(
          draggedImg.getData("key"),
          otherImg.getData("key"),
        );

        this.server.enigma1.move([
          { key: draggedImg.getData("key"), x: null, y: null },
          { key: otherImg.getData("key"), x: null, y: null },
        ]);
      },
    );

    // Bouton Vérifier
    const yButton = yImages + imageHeight / 2 + 50;
    this.add
      .text(this.cameras.main.centerX, yButton, "Vérifier", {
        fontSize: "32px",
        backgroundColor: "#000",
        color: "#fff",
        padding: { left: 10, right: 10, top: 10, bottom: 10 },
      })
      .setOrigin(0.5, 0.5)
      .setInteractive()
      .on("pointerdown", () => this.server.enigma1.submit());

    // Setup listeners at the end, after all images are created
    this.server.listeners = {
      onSceneChanged: this.onSceneChanged.bind(this),
      onGameUpdate: this.onGameUpdate.bind(this),
    };
  }

  /**
   * Converts a point from screen coordinates to normalized device coordinates (NDC: [-1, 1]).
   * @param {number} x - The x-coordinate in screen space.
   * @param {number} y - The y-coordinate in screen space.
   * @returns {{xNDC: number, yNDC: number}} The point in NDC.
   */
  toNDC(x, y) {
    const { width, height } = this.cameras.main;
    return { xNDC: (2 * x) / width - 1, yNDC: (2 * y) / height - 1 };
  }

  /**
   * Converts a point from normalized device coordinates (NDC: [-1, 1]) to screen coordinates.
   * @param {number} xNDC - The x-coordinate in NDC.
   * @param {number} yNDC - The y-coordinate in NDC.
   * @returns {{xScreen: number, yScreen: number}} The point in screen space.
   */
  toScreen(xNDC, yNDC) {
    const { width, height } = this.cameras.main;
    return {
      xScreen: ((xNDC + 1) * width) / 2,
      yScreen: ((yNDC + 1) * height) / 2,
    };
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
