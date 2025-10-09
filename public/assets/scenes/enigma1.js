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
      onSceneChanged: this.onSceneChanged.bind(this),
      onGameUpdate: this.onGameUpdate.bind(this),
    };
  }

  preload() {
    this.keys.forEach((key) =>
      this.load.image(key, "assets/images/storyboard/" + key + ".png")
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

      case "enigma1:move": {
        const key = event.data.key;
        const { xScreen, yScreen } = this.toScreen(event.data.x, event.data.y);
        this.images[key].x = xScreen;
        this.images[key].y = yScreen;
        break;
      }

      case "enigma1:swap-slots": {
        const key1 = event.data.key1;
        const key2 = event.data.key2;
        const slot1 = event.data.slot1;
        const slot2 = event.data.slot2;
        this.images[key1].setData("slot", slot1);
        this.images[key2].setData("slot", slot2);
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

    // Placer les images dans les slots
    let storyboardsToMove = [];
    this.server.state.room.Enigma1.storyboards.forEach((storyboard) => {
      /** @type Phaser.GameObjects.Rectangle */
      const slot = this.slots[storyboard.index];
      if (storyboard.position.x === null) {
        storyboard.position.x = 0;
        storyboard.position.y = 0;
        storyboardsToMove.push(storyboard);
      }

      const { xScreen, yScreen } = this.toScreen(
        this.slots[storyboard.index].x,
        this.slots[storyboard.index].y,
      );

      let img = this.add
        .image(xScreen, yScreen, storyboard.name)
        .setInteractive();

      img.setDisplaySize(imageWidth, imageHeight);
      img.setData("slot", storyboard.index);
      img.setData("key", storyboard.name);

      this.input.setDraggable(img);
      this.images[storyboard.name] = img;
    });

    for (let i = 0; i < storyboardsToMove.length; i++) {
      const storyboard = storyboardsToMove[i];
      let { xNDC, yNDC } = this.toNDC(
        this.slots[storyboard.index].x,
        this.slots[storyboard.index].y,
      );
      this.server.enigma1.move(storyboard.name, xNDC, yNDC);
    }

    // Drag & Drop
    this.input.on(
      "drag",
      (
        /** @type Phaser.Input.Pointer */ _pointer,
        /** @type Phaser.GameObjects.Image */ gameObject,
        /** @type number */ dragX,
        /** @type number */ dragY
      ) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
        this.server.enigma1.move(
          gameObject.getData("key"),
          dragX / this.scale.width,
          dragY / this.scale.height
        );
      }
    );

    this.input.on(
      "dragend",
      (
        /** @type Phaser.Input.Pointer */ _pointer,
        /** @type Phaser.GameObjects.Image */ draggedImg
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

        if (
          this.slots[closestSlotIndex].image &&
          this.slots[closestSlotIndex].image !== draggedImg
        ) {
          // Echanger les positions
          const otherImg = this.slots[closestSlotIndex].image;
          /** @type number */
          const tempSlotIndex = draggedImg.getData("slot");

          this.server.enigma1.move(
            draggedImg.getData("key"),
            draggedImg.x,
            draggedImg.y
          );
          this.server.enigma1.move(
            otherImg.getData("key"),
            otherImg.x,
            otherImg.y
          );
          this.server.enigma1.swapSlots(
            draggedImg.getData("key"),
            otherImg.getData("key"),
            closestSlotIndex,
            tempSlotIndex
          );
        } else {
          // Sinon remettre draggedImg à son slot initial
          const slot = draggedImg.getData("slot");
          let { xNDC, yNDC } = this.toNDC(slot.x, slot.y);

          this.server.enigma1.move(draggedImg.getData("key"), xNDC, yNDC);
        }
      }
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
