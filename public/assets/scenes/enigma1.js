class Enigma1Scene extends Phaser.Scene {
  constructor() {
    super("Enigma1");
    this.images = {};
    this.slots = [];
    this.keys = ["image1", "image2", "image3", "image4", "image5", "image6"];
    this.lastMoveTime = 0;
    this.moveThrottle = 13.33; // milliseconds between move requests
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
      onGameOver: this.onGameOver.bind(this),
    };
  }

  /**
   * Handles game over event
   *
   * @param {GameServer} _server
   * @param {string} reason
   */
  onGameOver(_server, reason) {
    this.scale.removeAllListeners("resize");
    this.input.removeAllListeners("drag");
    this.input.removeAllListeners("dragend");
    this.input.removeAllListeners("pointerdown");
    this.scene.start("GameOver", { server: this.server, reason });
  }

  preload() {
    this.load.image("enigma1-background", "assets/images/Montage.png");
    this.keys.forEach((key) =>
      this.load.image(
        "enigma1-" + key,
        "assets/images/storyboard/" + key + ".png",
      ),
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
    updateBackButton(server);
    this.scale.removeAllListeners("resize");
    this.scale.removeAllListeners("drag");
    this.input.removeAllListeners("dragend");
    this.input.removeAllListeners("pointerdown");
    this.scene.start(this.getSceneKey(scene), this.server);
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

    if (room.Enigma1.completed) {
      if (this.validateButtonBg) {
        this.validateButtonBg.disableInteractive().setAlpha(0.5);
        this.validateButtonText.setAlpha(0.5);
      }
    }

    switch (event.kind) {
      case "enigma1:submit":
        if (room.Enigma1.completed) {
          this.showModal({
            title: "Bravo !",
            description:
              "Bravo ! Vous avez reconstitué le scénario. La continuité narrative est essentielle, mais un bon film repose aussi sur un scénario solide, souvent structuré en trois actes. \n\nActe 1 (Exposition) : On découvre Rose, Jack, et le navire. L'incident déclencheur est leur rencontre.\nActe 2 (Confrontation) : Leur amour impossible grandit face aux interdits, jusqu'à la collision avec l'iceberg qui intensifie leur lutte pour survivre.\nActe 3 (Résolution) : Le naufrage culmine avec le sacrifice de Jack, la survie de Rose, et le dénouement de son histoire.\n\nCette structure, rythmée par des moments clés, est ce qui captive le spectateur.",
            emoji: "🎉",
            success: true,
            onClose: () => {
              // Rediriger vers la scène main
              this.server.changeScene("main");
            },
          });
        } else {
          this.showModal({
            title: "Pas tout à fait !",
            description:
              "Ce n'est pas encore le bon ordre. Observez bien les indices visuels : les raccords dans l'axe, la position des personnages et la lumière du jour.",
            emoji: "🤔",
            success: false,
            onClose: () => {
              // Rester sur la scène, permettre de réessayer
            },
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
      this.timerText.setText(
        `⏱️ ${minutes}:${secs.toString().padStart(2, "0")}`,
      );
    }
  }

  create() {
    const numImages = this.keys.length;
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    // Ajouter l'image de fond
    const background = this.add.image(
      screenWidth / 2,
      screenHeight / 2,
      "enigma1-background",
    );

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
      0.3,
    );
    overlay.setOrigin(0, 0);

    // === Header ===
    const headerY = 40;

    const title = this.add
      .text(screenWidth / 2, headerY, "LA CONTINUITÉ NARRATIVE", {
        fontSize: "48px",
        fontFamily: "Arial Black",
        color: "#ffd700",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        screenWidth / 2,
        headerY + 50,
        "Replacez les plans dans le bon ordre",
        {
          fontSize: "24px",
          fontFamily: "Arial",
          color: "#ffffff",
          fontStyle: "italic",
        },
      )
      .setOrigin(0.5);

    // Calculer la taille des images en fonction de l'écran
    let imageWidth = 250;
    let imageHeight = 150;
    const spacingX = 20;
    const spacingY = 50; // Augmenter l'espacement vertical pour que les numéros soient visibles

    // Déterminer le nombre de colonnes et rangées
    let columns = 3; // 3 colonnes par rangée
    let rows = 2; // 2 rangées

    // Recalculer la taille des images pour qu'elles tiennent
    const maxWidthPerImage =
      (screenWidth * 0.9 - (columns - 1) * spacingX) / columns;
    imageWidth = maxWidthPerImage;
    imageHeight = imageWidth * 0.6; // Garder le ratio

    // Calculer les positions de départ pour centrer la grille
    const totalWidth = columns * imageWidth + (columns - 1) * spacingX;
    const totalHeight = rows * imageHeight + (rows - 1) * spacingY;
    const descriptionHeight = 150; // Espace pour la description
    const startX = (screenWidth - totalWidth) / 2 + imageWidth / 2;

    // Centrer verticalement : si une seule ligne, utiliser le centre de l'écran
    let startY;
    if (rows === 1) {
      // Centrer verticalement en tenant compte de la description et du bouton
      const availableHeight = screenHeight - descriptionHeight - 120; // 120 pour le bouton en bas
      startY =
        descriptionHeight +
        (availableHeight - imageHeight) / 2 +
        imageHeight / 2;
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
        fontSize: "32px",
        fontStyle: "bold",
        color: "#FFD700",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setDepth(102);

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
        .image(xScreen, yScreen, "enigma1-" + storyboard.name)
        .setInteractive();

      img.setDisplaySize(imageWidth, imageHeight);
      img.setData("slot", storyboard.index);
      img.setData("key", storyboard.name);

      this.input.setDraggable(img);
      this.images[storyboard.name] = img;
    });

    // Drag & Drop
    this.input.on(
      "dragstart",
      (
        /** @type Phaser.Input.Pointer */ _pointer,
        /** @type Phaser.GameObjects.Image */ gameObject,
      ) => {
        gameObject.setDepth(1);
      },
    );

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

        // Throttle move requests
        const currentTime = Date.now();
        if (currentTime - this.lastMoveTime >= this.moveThrottle) {
          this.lastMoveTime = currentTime;
          let { xNDC, yNDC } = this.toNDC(dragX, dragY);
          this.server.enigma1.move([
            { key: gameObject.getData("key"), x: xNDC, y: yNDC },
          ]);
        }
      },
    );

    this.input.on(
      "dragend",
      (
        /** @type Phaser.Input.Pointer */ _pointer,
        /** @type Phaser.GameObjects.Image */ draggedImg,
      ) => {
        draggedImg.setDepth(0);

        // Trouver le slot le plus proche en utilisant la distance euclidienne
        let closestSlotIndex = this.slots
          .map((_, index) => index)
          .reduce((prev, curr) => {
            const distPrev = Math.sqrt(
              Math.pow(this.slots[prev].x - draggedImg.x, 2) +
                Math.pow(this.slots[prev].y - draggedImg.y, 2),
            );
            const distCurr = Math.sqrt(
              Math.pow(this.slots[curr].x - draggedImg.x, 2) +
                Math.pow(this.slots[curr].y - draggedImg.y, 2),
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
    const buttonY = screenHeight - 60;
    const buttonWidth = 250;
    const buttonHeight = 60;

    this.validateButtonBg = this.add.rectangle(
      screenWidth / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x4a90e2
    );
    this.validateButtonBg.setStrokeStyle(3, 0x000000);
    this.validateButtonBg.setDepth(999);
    this.validateButtonBg.setInteractive({ useHandCursor: true });

    this.validateButtonText = this.add
      .text(screenWidth / 2, buttonY, "✓ VÉRIFIER", {
        fontSize: "32px",
        fontStyle: "bold",
        color: "#fff",
        fontFamily: "Arial",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(1000);

    // Animation permanente du bouton
    this.tweens.add({
      targets: [this.validateButtonBg, this.validateButtonText],
      scaleY: { from: 1, to: 1.05 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.validateButtonBg.on("pointerover", () => {
      this.validateButtonBg.setFillStyle(0x00ff88);
      this.tweens.killTweensOf([this.validateButtonBg, this.validateButtonText]);
      this.tweens.add({
        targets: [this.validateButtonBg, this.validateButtonText],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 200,
        ease: "Back.easeOut",
      });
    });

    this.validateButtonBg.on("pointerout", () => {
      this.validateButtonBg.setFillStyle(0x4a90e2);
      this.tweens.killTweensOf([this.validateButtonBg, this.validateButtonText]);
      this.tweens.add({
        targets: [this.validateButtonBg, this.validateButtonText],
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: "Back.easeIn",
      });
    });

    this.validateButtonBg.on("pointerdown", () => {
      if (this.server.state.room.Enigma1.completed) return;
      this.tweens.killTweensOf([this.validateButtonBg, this.validateButtonText]);
      this.tweens.add({
        targets: [this.validateButtonBg, this.validateButtonText],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: "Power2",
        onComplete: () => {
          this.server.enigma1.submit();
        },
      });
    });

    if (this.server.state.room.Enigma1.completed) {
      this.validateButtonBg.disableInteractive().setAlpha(0.5);
      this.validateButtonText.setAlpha(0.5);
    }

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
    const { width, height } = this.cameras.main;

    // Fond sombre semi-transparent qui bloque toutes les interactions
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.85,
    );
    overlay.setDepth(1000);
    overlay.setInteractive();

    // Dimensions du panneau
    const panelWidth = Math.min(700, width * 0.9);
    const panelHeight = Math.min(650, height * 0.8);

    // Ombre du panneau
    const panelShadow = this.add.rectangle(
      width / 2 + 6,
      height / 2 + 6,
      panelWidth,
      panelHeight,
      0x000000,
      0.8,
    );
    panelShadow.setDepth(1001);

    // Fond du panneau
    const panelBg = this.add.rectangle(
      width / 2,
      height / 2,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.98,
    );
    panelBg.setStrokeStyle(5, success ? 0x00ff88 : 0xff4444, 1);
    panelBg.setDepth(1002);

    // Bordure intérieure dorée
    const innerBorder = this.add.rectangle(
      width / 2,
      height / 2,
      panelWidth - 10,
      panelHeight - 10,
      0x000000,
      0,
    );
    innerBorder.setStrokeStyle(3, 0xffd700, 0.6);
    innerBorder.setDepth(1003);

    // Icône (emoji)
    const successIcon = this.add
      .text(width / 2, height / 2 - panelHeight / 2 + 80, emoji, {
        fontSize: "80px",
        color: success ? "#00ff88" : "#ff4444",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(1004);

    // Titre
    const titleText = this.add
      .text(width / 2, height / 2 - panelHeight / 2 + 160, title, {
        fontSize: "36px",
        fontStyle: "bold",
        color: "#FFD700",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1004);

    // Texte de description
    const descText = this.add
      .text(width / 2, height / 2 + 20, description, {
        fontSize: "17px",
        color: "#FFFFFF",
        fontFamily: "Arial",
        align: "center",
        lineSpacing: 6,
        wordWrap: { width: panelWidth - 100 },
      })
      .setOrigin(0.5)
      .setDepth(1004);

    // Bouton Fermer
    const buttonWidth = 200;
    const buttonHeight = 55;
    const buttonY = height / 2 + panelHeight / 2 - 70;

    const closeButtonBg = this.add.rectangle(
      width / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      success ? 0x00ff88 : 0xff4444,
      1,
    );
    closeButtonBg.setStrokeStyle(4, 0xffd700, 1);
    closeButtonBg.setDepth(1004);
    closeButtonBg.setInteractive({ useHandCursor: true });

    const closeButtonText = this.add
      .text(width / 2, buttonY, "Fermer", {
        fontSize: "22px",
        color: success ? "#000000" : "#FFFFFF",
        fontStyle: "bold",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5)
      .setDepth(1005);

    // Objets à animer
    const modalElements = [
      overlay,
      panelShadow,
      panelBg,
      innerBorder,
      successIcon,
      titleText,
      descText,
      closeButtonBg,
      closeButtonText,
    ];

    // Fermeture de la modale
    const closeModal = () => {
      this.tweens.add({
        targets: modalElements,
        alpha: 0,
        scale: 0.8,
        duration: 300,
        ease: "Back.easeIn",
        onComplete: () => {
          modalElements.forEach((el) => el.destroy());
          if (onClose) {
            onClose();
          }
        },
      });
    };

    closeButtonBg.on("pointerdown", closeModal);
    overlay.on("pointerdown", closeModal);

    closeButtonBg.on("pointerover", () => {
      this.tweens.add({
        targets: [closeButtonBg, closeButtonText],
        scale: 1.08,
        duration: 200,
        ease: "Power2",
      });
    });

    closeButtonBg.on("pointerout", () => {
      this.tweens.add({
        targets: [closeButtonBg, closeButtonText],
        scale: 1,
        duration: 200,
        ease: "Power2",
      });
    });

    // Animation d'apparition
    modalElements.forEach((el) => {
      el.setAlpha(0);
      el.setScale(0.8);
    });
    this.tweens.add({
      targets: modalElements,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: "Back.easeOut",
    });
  }
}
