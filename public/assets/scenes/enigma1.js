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
    this.load.image("background", "assets/images/Montage.png");
    this.keys.forEach((key) =>
      this.load.image(key, "assets/images/storyboard/" + key + ".png"),
    );
  }

  /**

   * Handles error messages from the server.
   * @param {string} message - The error message.
   */
  onError(message) {
    console.error("Error:", message);
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
    // Toujours mettre à jour le timer
    this.updateTimer(room.timer);

    switch (event.kind) {
      case "enigma1:submit":
        if (room.Enigma1.completed) {
          this.showModal({
            title: "Bravo !",
            description: "Vous avez compris la continuité narrative. Au cinéma, chaque plan doit s'enchaîner logiquement avec le suivant (règle des 30°, respect de l'axe d'action).",
            emoji: "🎉",
            success: true,
            onClose: () => {
              // Rediriger vers la scène main
              this.server.changeScene("main");
            }
          });
        } else {
          this.showModal({
            title: "Pas tout à fait !",
            description: "Ce n'est pas encore le bon ordre. Observez bien les indices visuels : les raccords dans l'axe, la position des personnages et la lumière du jour.",
            emoji: "🤔",
            success: false,
            onClose: () => {
              // Rester sur la scène, permettre de réessayer
            }
          });
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

        this.server.enigma1.move([
          { key: key1, x: null, y: null },
          { key: key2, x: null, y: null },
        ]);
        break;
      }

      case "game:timer":
        // Mise à jour du timer déjà gérée au début
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
      this.timerText.setText(`⏱️ ${minutes}:${secs.toString().padStart(2, "0")}`);
    }
  }

  create() {
    const numImages = this.keys.length;
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;
    
    // Ajouter l'image de fond
    const background = this.add.image(screenWidth / 2, screenHeight / 2, "background");
    
    // Ajuster la taille du fond pour couvrir tout l'écran
    const scaleX = screenWidth / background.width;
    const scaleY = screenHeight / background.height;
    const scale = Math.max(scaleX, scaleY);
    background.setScale(scale);
    
    // Overlay semi-transparent pour améliorer la lisibilité
    const overlay = this.add.rectangle(
      0,
      0,
      screenWidth,
      screenHeight,
      0x000000,
      0.3
    );
    overlay.setOrigin(0, 0);
    
    // Ajouter la description en haut
    const descriptionText = this.add.text(
      screenWidth / 2,
      30,
      "Comprendre la continuité narrative et le découpage en plans",
      {
        fontSize: "22px",
        fontFamily: "Arial",
        color: "#FFD700",
        stroke: "#000",
        strokeThickness: 3,
        align: "center"
      }
    ).setOrigin(0.5, 0);
    
    // Calculer la taille des images en fonction de l'écran
    let imageWidth = 250;
    let imageHeight = 150;
    const spacingX = 20;
    const spacingY = 50; // Augmenter l'espacement vertical pour que les numéros soient visibles
    
    // Déterminer le nombre de colonnes et rangées
    let columns = numImages;
    let rows = 1;
    
    // Si les images en ligne dépassent 90% de la largeur, passer en 2 rangées
    const totalWidthOneLine = numImages * imageWidth + (numImages - 1) * spacingX;
    if (totalWidthOneLine > screenWidth * 0.9) {
      columns = 3; // 3 colonnes par rangée
      rows = 2; // 2 rangées
      
      // Recalculer la taille des images pour qu'elles tiennent
      const maxWidthPerImage = (screenWidth * 0.9 - (columns - 1) * spacingX) / columns;
      if (maxWidthPerImage < imageWidth) {
        imageWidth = maxWidthPerImage;
        imageHeight = imageWidth * 0.6; // Garder le ratio
      }
    }
    
    // Calculer les positions de départ pour centrer la grille
    const totalWidth = columns * imageWidth + (columns - 1) * spacingX;
    const totalHeight = rows * imageHeight + (rows - 1) * spacingY;
    const descriptionHeight = 80; // Espace pour la description
    const startX = (screenWidth - totalWidth) / 2 + imageWidth / 2;
    
    // Centrer verticalement : si une seule ligne, utiliser le centre de l'écran
    let startY;
    if (rows === 1) {
      // Centrer verticalement en tenant compte de la description et du bouton
      const availableHeight = screenHeight - descriptionHeight - 120; // 120 pour le bouton en bas
      startY = descriptionHeight + (availableHeight - imageHeight) / 2 + imageHeight / 2;
    } else {
      // Position fixe plus haute pour 2 rangées
      startY = descriptionHeight + 30 + imageHeight / 2;
    }

    // Créer les slots et les numéros
    for (let i = 0; i < numImages; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      
      const x = startX + col * (imageWidth + spacingX);
      const y = startY + row * (imageHeight + spacingY);

      // Slot visible
      let slot = this.add
        .rectangle(x, y, imageWidth, imageHeight, 0xffffff, 0.2)
        .setStrokeStyle(2, 0x000000);

      // @ts-ignore
      slot.correctIndex = i;
      this.slots.push(slot);

      // Numéro au-dessus
      const numberY = y - imageHeight / 2 - 20;
      this.add
        .text(x, numberY, (i + 1).toString(), {
          fontSize: "28px",
          fontStyle: "bold",
          color: "#FFD700",
          stroke: "#000",
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0.5);
    }

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
        // Trouver le slot le plus proche en utilisant la distance euclidienne
        let closestSlotIndex = this.slots
          .map((_, index) => index)
          .reduce((prev, curr) => {
            const distPrev = Math.sqrt(
              Math.pow(this.slots[prev].x - draggedImg.x, 2) +
              Math.pow(this.slots[prev].y - draggedImg.y, 2)
            );
            const distCurr = Math.sqrt(
              Math.pow(this.slots[curr].x - draggedImg.x, 2) +
              Math.pow(this.slots[curr].y - draggedImg.y, 2)
            );
            return distCurr < distPrev ? curr : prev;
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
      },
    );

    this.scale.on("resize", () => {
      this.scene.restart();
    });

    // Bouton Vérifier
    const yButton = screenHeight - 60;
    this.add
      .text(screenWidth / 2, yButton, "✓ VÉRIFIER", {
        fontSize: "32px",
        fontStyle: "bold",
        backgroundColor: "#4a90e2",
        color: "#fff",
        padding: { left: 20, right: 20, top: 15, bottom: 15 },
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", function() {
        this.setStyle({ backgroundColor: "#00ff88" });
      })
      .on("pointerout", function() {
        this.setStyle({ backgroundColor: "#4a90e2" });
      })
      .on("pointerdown", () => this.server.enigma1.submit());

    // Setup listeners at the end, after all images are created
    this.server.listeners.onGameUpdate = this.onGameUpdate.bind(this);
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

  /**
   * Affiche une modale personnalisée avec un message et une description
   *
   * @param {Object} options - Options de la modale
   * @param {string} options.title - Titre de la modale
   * @param {string} options.description - Description détaillée
   * @param {string} options.emoji - Emoji à afficher
   * @param {boolean} options.success - Si true, affiche en vert (succès), sinon en orange (échec)
   * @param {Function} [options.onClose] - Callback optionnel lors de la fermeture
   */
  showModal({ title, description, emoji, success, onClose }) {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    // Overlay semi-transparent
    const overlay = this.add.rectangle(
      0,
      0,
      screenWidth,
      screenHeight,
      0x000000,
      0.7
    );
    overlay.setOrigin(0, 0);
    overlay.setDepth(1000);
    overlay.setInteractive();

    // Container de la modale
    const modalWidth = Math.min(600, screenWidth * 0.9);
    const modalHeight = Math.min(400, screenHeight * 0.8);
    const modalX = screenWidth / 2;
    const modalY = screenHeight / 2;

    // Fond de la modale
    const modalBg = this.add.rectangle(
      modalX,
      modalY,
      modalWidth,
      modalHeight,
      success ? 0x2d5016 : 0x8b4513
    );
    modalBg.setStrokeStyle(4, success ? 0x4CAF50 : 0xff9900);
    modalBg.setDepth(1001);

    // Emoji en haut
    const emojiText = this.add.text(modalX, modalY - modalHeight / 2 + 60, emoji, {
      fontSize: "64px",
      align: "center"
    });
    emojiText.setOrigin(0.5, 0.5);
    emojiText.setDepth(1002);

    // Titre
    const titleText = this.add.text(modalX, modalY - modalHeight / 2 + 130, title, {
      fontSize: "32px",
      fontStyle: "bold",
      color: success ? "#4CAF50" : "#ffcc00",
      align: "center",
      wordWrap: { width: modalWidth - 60 }
    });
    titleText.setOrigin(0.5, 0.5);
    titleText.setDepth(1002);

    // Description
    const descText = this.add.text(modalX, modalY - 20, description, {
      fontSize: "18px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: modalWidth - 80 }
    });
    descText.setOrigin(0.5, 0.5);
    descText.setDepth(1002);

    // Bouton Fermer
    const buttonY = modalY + modalHeight / 2 - 60;
    const buttonWidth = 200;
    const buttonHeight = 50;

    const closeButton = this.add.rectangle(
      modalX,
      buttonY,
      buttonWidth,
      buttonHeight,
      success ? 0x4CAF50 : 0xff9900
    );
    closeButton.setStrokeStyle(3, 0xffffff);
    closeButton.setDepth(1002);
    closeButton.setInteractive({ useHandCursor: true });

    const closeButtonText = this.add.text(modalX, buttonY, "FERMER", {
      fontSize: "24px",
      fontStyle: "bold",
      color: "#ffffff"
    });
    closeButtonText.setOrigin(0.5, 0.5);
    closeButtonText.setDepth(1003);

    // Effet hover sur le bouton
    closeButton.on("pointerover", () => {
      closeButton.setFillStyle(success ? 0x45a049 : 0xff8800);
      closeButton.setScale(1.05);
      closeButtonText.setScale(1.05);
    });

    closeButton.on("pointerout", () => {
      closeButton.setFillStyle(success ? 0x4CAF50 : 0xff9900);
      closeButton.setScale(1);
      closeButtonText.setScale(1);
    });

    // Fermeture de la modale
    const closeModal = () => {
      overlay.destroy();
      modalBg.destroy();
      emojiText.destroy();
      titleText.destroy();
      descText.destroy();
      closeButton.destroy();
      closeButtonText.destroy();

      if (onClose) {
        onClose();
      }
    };

    closeButton.on("pointerdown", closeModal);

    // Permettre de fermer en cliquant sur l'overlay (facultatif)
    overlay.on("pointerdown", closeModal);
  }
}
