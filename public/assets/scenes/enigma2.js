class Enigma2Scene extends Phaser.Scene {
  constructor() {
    super({ key: "Enigma2" });
    this.draggedType = null;
    this.isDragging = false;
    this.draggedFromSlot = false;
    this.draggedFromSlotIndex = null;
    this.score = 0;
    this.totalPhotos = 5;
    this.typeSlots = [];
    this.typeButtons = [];
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
    console.log("Enigma2: Scene changed to:", scene);

    if (scene !== "enigma2") {
      this.scale.removeAllListeners("resize");
      this.input.removeAllListeners("drop");
      this.input.removeAllListeners("dragstart");
      this.input.removeAllListeners("drag");
      this.input.removeAllListeners("dragend");
      this.input.removeAllListeners("pointerdown");

      const sceneMap = {
        main: "Main",
        enigma1: "Enigma1",
        enigma2: "Enigma2",
        enigma3: "Enigma3",
        enigma4: "Enigma4",
        finale: "Finale",
      };

      const sceneKey = sceneMap[scene] || "Main";
      console.log("Enigma2: Starting scene:", sceneKey);
      this.scene.start(sceneKey, this.server);
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
        `⏱️ ${minutes}:${secs.toString().padStart(2, "0")}`
      );
    }
  }

  preload() {
    this.load.image("photo1", "assets/images/lumieres/scene1filtre1.png");
    this.load.image("photo2", "assets/images/lumieres/scene1filtre2.png");
    this.load.image("photo3", "assets/images/lumieres/scene1filtre3.png");
    this.load.image("photo4", "assets/images/lumieres/scene1filtre4.png");
    this.load.image("photo5", "assets/images/lumieres/scene1ok.jpg");
    this.load.image("background", "assets/images/lumieres/lightning-bg.png");
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

    console.log("onGameUpdate", { event, room });
    switch (event.kind) {
      case "enigma2:update":
      case "enigma2:reset":
        // Update UI based on server state
        this.updateUIFromServerState(room.Enigma2.photos);
        break;

      case "enigma2:submit-result":
        if (event.data.completed) {
          this.showSuccessModal();
        } else {
          this.showMessage(
            "Certaines associations sont incorrectes.",
            "#ffaa00"
          );
        }
        break;

      case "game:timer":
        // TODO: TIMER
        break;
    }
  }

  /**
   * Updates the UI based on the server state
   * @param {Array<string>} photos - The photos array from server state
   */
  updateUIFromServerState(photos) {
    console.log("updateUIFromServerState", { photos });
    // Reset all UI elements first
    this.typeSlots.forEach((slot, index) => {
      const assignedType = photos[index];

      // Update slot (check for non-empty string)
      if (assignedType && assignedType !== "") {
        slot.assignedType = assignedType;
        slot.text.setText(assignedType);
        slot.text.setColor("#FFD700");
        slot.text.setFontStyle("bold");

        // Style de succès (bordure verte style enigma3)
        slot.background.setFillStyle(0x1a1a1a, 0.9);
        slot.background.setStrokeStyle(3, 0x00ff88, 1);
        if (slot.innerBorder) {
          slot.innerBorder.setStrokeStyle(1, 0x00ff88, 0.4);
        }

        // Enable dragging when slot has content
        this.input.setDraggable(slot.text, true);
      } else {
        slot.assignedType = null;
        slot.text.setText("Déposez ici");
        slot.text.setColor("#4a90e2");
        slot.text.setFontStyle("bold");

        // Style normal (bordure bleue style enigma3)
        slot.background.setFillStyle(0x1a1a1a, 0.85);
        slot.background.setStrokeStyle(3, 0x4a90e2, 1);
        if (slot.innerBorder) {
          slot.innerBorder.setStrokeStyle(1, 0xffffff, 0.2);
        }

        // Disable dragging when slot is empty
        this.input.setDraggable(slot.text, false);
      }
    });

    // Update type buttons based on what's been used (style enigma3)
    this.typeButtons.forEach((typeButton) => {
      // Check if this type is used (not empty string)
      const isUsed = photos.some((p) => p === typeButton.type);
      typeButton.used = isUsed;
      if (isUsed) {
        typeButton.background.setFillStyle(0x1a1a1a, 0.5);
        typeButton.background.setStrokeStyle(2, 0x666666, 0.5);
        typeButton.text.setAlpha(0.4);
        typeButton.text.setColor("#999999");
        if (typeButton.shadow) typeButton.shadow.setAlpha(0.3);
        if (typeButton.innerRect) typeButton.innerRect.setAlpha(0.3);
        if (typeButton.infoBadge) typeButton.infoBadge.setAlpha(0.4);
        if (typeButton.infoText) typeButton.infoText.setAlpha(0.4);
      } else {
        typeButton.background.setFillStyle(0x1a1a1a, 0.9);
        typeButton.background.setStrokeStyle(3, 0xffd700, 0.8);
        typeButton.text.setAlpha(1);
        typeButton.text.setColor("#FFD700");
        if (typeButton.shadow) typeButton.shadow.setAlpha(0.5);
        if (typeButton.innerRect) typeButton.innerRect.setAlpha(1);
        if (typeButton.infoBadge) typeButton.infoBadge.setAlpha(1);
        if (typeButton.infoText) typeButton.infoText.setAlpha(1);
      }
    });

    this.updateScore();
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

  create() {
    const { width, height } = this.scale;

    // === Background avec overlay sombre (style enigma3) ===
    const bg = this.add.image(width / 2, height / 2, "background");
    bg.setDisplaySize(width, height);
    bg.setAlpha(0.4);

    // Overlay gradient sombre
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.6
    );
    overlay.setDepth(-1);

    // === Photos data ===
    this.photoData = [
      { key: "photo1", type: "Éclairage 3 points" },
      { key: "photo2", type: "Low-key (film noir)" },
      { key: "photo3", type: "High-key" },
      { key: "photo4", type: "Contre-jour" },
      { key: "photo5", type: "Lumière naturelle" },
    ];

    // === Titre avec effet néon (style enigma3) ===
    const titleBg = this.add.rectangle(width / 2, 35, 650, 60, 0x000000, 0.8);
    titleBg.setStrokeStyle(3, 0xffd700, 0.8);
    titleBg.setDepth(100);

    const title = this.add
      .text(width / 2, 30, "L'ÉNIGME DE L'ÉCLAIRAGE", {
        fontSize: "32px",
        fontStyle: "bold",
        color: "#FFD700",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5)
      .setDepth(101);

    // Effet de brillance sur le titre
    this.tweens.add({
      targets: title,
      alpha: { from: 0.8, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const subtitle = this.add
      .text(
        width / 2,
        58,
        "✨ Glissez les types d'éclairage vers les slots sous chaque photo ✨",
        {
          fontSize: "14px",
          color: "#FFF",
          fontStyle: "italic",
          fontFamily: "Arial",
        }
      )
      .setOrigin(0.5)
      .setDepth(101);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0.6, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // === Timer en haut à droite (style enigma3) ===
    this.timerText = this.add
      .text(width - 20, 20, "", {
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
    if (this.server && this.server.state && this.server.state.room) {
      this.updateTimer(this.server.state.room.timer);
    }

    this.createPhotosWithSlots();
    this.createTypesPanel();
    this.createActionButtons();

    // Load initial state from server
    this.updateUIFromServerState(this.server.state.room.Enigma2.photos);
  }

  createPhotosWithSlots() {
    const { width } = this.scale;
    const photoWidth = 250;
    const photoHeight = 200;
    const slotHeight = 45;
    const spacingX = 60;
    const spacingY = 150;

    // Placement des 5 images sur deux lignes
    const cols = 3;
    const startX = width * 0.2; // bloc gauche
    const startY = 130;

    this.photoData.forEach((photoData, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = startX + col * (photoWidth + spacingX);
      const y = startY + row * (photoHeight + spacingY);

      // Image
      this.add
        .image(x, y, photoData.key)
        .setDisplaySize(photoWidth, photoHeight)
        .setOrigin(0);

      // Numéro
      this.add.text(x + 5, y + 5, `${index + 1}`, {
        fontSize: "14px",
        color: "#ffcc00",
        fontStyle: "bold",
      });

      // Slot (style enigma3 avec bordure bleue)
      const slotBg = this.add
        .rectangle(
          x + photoWidth / 2,
          y + photoHeight + 25,
          photoWidth,
          slotHeight,
          0x1a1a1a,
          0.85
        )
        .setStrokeStyle(3, 0x4a90e2, 1);

      // Bordure intérieure subtile
      const innerBorder = this.add.rectangle(
        x + photoWidth / 2,
        y + photoHeight + 25,
        photoWidth - 6,
        slotHeight - 6,
        0x000000,
        0
      );
      innerBorder.setStrokeStyle(1, 0xffffff, 0.2);

      const slotText = this.add
        .text(x + photoWidth / 2, y + photoHeight + 25, "Déposez ici", {
          fontSize: "14px",
          color: "#4a90e2",
          fontStyle: "bold",
          fontFamily: "Arial",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      // Store original position for drag operations
      slotText.originalX = x + photoWidth / 2;
      slotText.originalY = y + photoHeight + 25;
      slotText.slotIndex = index;

      const slotZone = this.add
        .zone(x + photoWidth / 2, y + photoHeight + 25, photoWidth, slotHeight)
        .setRectangleDropZone(photoWidth, slotHeight);
      slotZone.slotIndex = index;

      this.typeSlots.push({
        background: slotBg,
        text: slotText,
        assignedType: null,
        index,
        zone: slotZone,
        innerBorder,
      });
    });

    // Gestion du drop avec effets de hover (style enigma3)
    this.input.on("dragenter", (pointer, gameObject, dropZone) => {
      if (dropZone.slotIndex !== undefined) {
        const slot = this.typeSlots[dropZone.slotIndex];
        if (slot) {
          // Effet jaune sur hover
          slot.background.setStrokeStyle(4, 0xffff00, 1);
          slot.background.setFillStyle(0xffff00, 0.2);
          if (slot.innerBorder) {
            slot.innerBorder.setStrokeStyle(2, 0xffff00, 0.4);
          }
          this.tweens.add({
            targets: slot.background,
            scale: 1.05,
            duration: 200,
            ease: "Power2",
          });
        }
      }
    });

    this.input.on("dragleave", (pointer, gameObject, dropZone) => {
      if (dropZone.slotIndex !== undefined) {
        const slot = this.typeSlots[dropZone.slotIndex];
        if (slot && !slot.assignedType) {
          // Retour au style normal
          slot.background.setStrokeStyle(3, 0x4a90e2, 1);
          slot.background.setFillStyle(0x1a1a1a, 0.85);
          if (slot.innerBorder) {
            slot.innerBorder.setStrokeStyle(1, 0xffffff, 0.2);
          }
          this.tweens.add({
            targets: slot.background,
            scale: 1,
            duration: 200,
            ease: "Power2",
          });
        }
      }
    });

    this.input.on("drop", (pointer, gameObject, dropZone) => {
      console.log("Drop event fired", {
        isDragging: this.isDragging,
        draggedType: this.draggedType,
        slotIndex: dropZone.slotIndex,
      });
      if (this.isDragging && this.draggedType != null) {
        this.assignTypeToSlot(dropZone.slotIndex, this.draggedType);

        // Réinitialiser les flags de dragging après le drop
        this.isDragging = false;
        if (!this.draggedFromSlot) {
          // Si on draggait depuis la liste, on ne réinitialise que draggedType
          this.draggedType = null;
          this.draggedTypeIndex = null;
        } else {
          // Si on draggait depuis un slot, on réinitialise aussi ces flags
          this.draggedFromSlot = false;
          this.draggedFromSlotIndex = null;
          this.draggedType = null;
        }
      }
    });

    // Global drag handlers for slot text elements
    this.input.on("dragstart", (pointer, gameObject) => {
      // Check if this is a slot text being dragged
      if (gameObject.slotIndex !== undefined) {
        const slot = this.typeSlots[gameObject.slotIndex];
        if (slot && slot.assignedType) {
          this.startDragFromSlot(
            slot.assignedType,
            gameObject.slotIndex,
            gameObject
          );
        }
      }
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      // Check if this is a slot text being dragged
      if (gameObject.slotIndex !== undefined && this.draggedFromSlot) {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    });

    this.input.on("dragend", (pointer, gameObject) => {
      // Check if this is a slot text being dragged
      if (gameObject.slotIndex !== undefined && this.draggedFromSlot) {
        this.endDragFromSlot(gameObject);
      }
    });
  }

  createTypesPanel() {
    const { width, height } = this.scale;
    // Use shuffled order from server if available, fallback to default
    const types = this.server?.state?.room?.Enigma2?.typesOrder || [
      "Éclairage 3 points",
      "Low-key (film noir)",
      "High-key",
      "Contre-jour",
      "Lumière naturelle",
    ];

    const startX = width * 0.75;
    const startY = height / 2 - (types.length * 60) / 2;
    const buttonHeight = 60;
    const buttonWidth = 220;
    const spacing = 70;

    // Titre (style enigma3)
    const panelTitle = this.add
      .text(startX, startY - 50, "TYPES D'ÉCLAIRAGE", {
        fontSize: "18px",
        color: "#FFD700",
        fontStyle: "bold",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Effet de brillance sur le titre du panneau
    this.tweens.add({
      targets: panelTitle,
      alpha: { from: 0.8, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    types.forEach((type, index) => {
      const y = startY + index * spacing;

      // Ombre portée (style enigma3)
      const shadow = this.add.rectangle(
        startX + 3,
        y + 3,
        buttonWidth,
        buttonHeight,
        0x000000,
        0.5
      );

      // Rectangle principal avec remplissage sombre
      const typeBg = this.add
        .rectangle(startX, y, buttonWidth, buttonHeight, 0x1a1a1a, 0.9)
        .setStrokeStyle(3, 0xffd700, 0.8)
        .setInteractive({ draggable: true, useHandCursor: true });

      // Bordure intérieure subtile
      const innerRect = this.add.rectangle(
        startX,
        y,
        buttonWidth - 6,
        buttonHeight - 6,
        0x000000,
        0
      );
      innerRect.setStrokeStyle(1, 0xffffff, 0.2);

      const typeText = this.add
        .text(startX, y, type, {
          fontSize: "14px",
          color: "#FFD700",
          align: "center",
          fontStyle: "bold",
          fontFamily: "Arial",
          wordWrap: { width: buttonWidth - 10 },
        })
        .setOrigin(0.5);

      // Badge "i" pour info (style enigma3)
      const infoBadge = this.add.circle(
        startX + buttonWidth / 2 - 15,
        y - buttonHeight / 2 + 15,
        12,
        0x4a90e2,
        1
      );
      infoBadge.setStrokeStyle(2, 0xffffff);
      infoBadge.setDepth(10);
      infoBadge.setInteractive({ useHandCursor: true });

      const infoText = this.add
        .text(startX + buttonWidth / 2 - 15, y - buttonHeight / 2 + 15, "i", {
          fontSize: "16px",
          fontStyle: "bold italic",
          color: "#FFF",
          fontFamily: "Arial",
        })
        .setOrigin(0.5);
      infoText.setDepth(11);
      infoText.setInteractive({ useHandCursor: true });

      // Effet hover sur le badge "i"
      infoBadge.on("pointerover", () => {
        infoBadge.setFillStyle(0x6ab0ff, 1);
        this.tweens.add({
          targets: [infoBadge, infoText],
          scale: 1.2,
          duration: 200,
          ease: "Power2",
        });
      });

      infoBadge.on("pointerout", () => {
        infoBadge.setFillStyle(0x4a90e2, 1);
        this.tweens.add({
          targets: [infoBadge, infoText],
          scale: 1,
          duration: 200,
          ease: "Power2",
        });
      });

      // Click sur le badge "i" pour afficher les informations
      const showInfo = () => {
        this.showLightingInfo(type);
      };
      infoBadge.on("pointerdown", showInfo);
      infoText.on("pointerdown", showInfo);

      // Effets hover (style enigma3)
      typeBg.on("pointerover", () => {
        if (!this.typeButtons[index]?.used) {
          typeBg.setStrokeStyle(4, 0xffff00, 1);
          typeBg.setFillStyle(0xffff00, 0.2);
          this.tweens.add({
            targets: [typeBg, typeText, innerRect, shadow],
            scale: 1.05,
            duration: 200,
            ease: "Power2",
          });
        }
      });

      typeBg.on("pointerout", () => {
        if (!this.typeButtons[index]?.used) {
          typeBg.setStrokeStyle(3, 0xffd700, 0.8);
          typeBg.setFillStyle(0x1a1a1a, 0.9);
          this.tweens.add({
            targets: [typeBg, typeText, innerRect, shadow],
            scale: 1,
            duration: 200,
            ease: "Power2",
          });
        }
      });

      typeBg.on("dragstart", () =>
        this.startDrag(
          type,
          index,
          typeBg,
          shadow,
          innerRect,
          infoBadge,
          infoText
        )
      );
      typeBg.on("drag", (pointer, dragX, dragY) => {
        if (this.isDragging) {
          typeBg.x = dragX;
          typeBg.y = dragY;
          typeText.x = dragX;
          typeText.y = dragY;
          shadow.x = dragX + 3;
          shadow.y = dragY + 3;
          innerRect.x = dragX;
          innerRect.y = dragY;
          infoBadge.x = dragX + buttonWidth / 2 - 15;
          infoBadge.y = dragY - buttonHeight / 2 + 15;
          infoText.x = dragX + buttonWidth / 2 - 15;
          infoText.y = dragY - buttonHeight / 2 + 15;
        }
      });
      typeBg.on("dragend", () =>
        this.endDrag(
          typeBg,
          typeText,
          shadow,
          innerRect,
          infoBadge,
          infoText,
          startX,
          y,
          buttonWidth,
          buttonHeight
        )
      );

      this.typeButtons.push({
        background: typeBg,
        text: typeText,
        type,
        index,
        used: false,
        shadow,
        innerRect,
        infoBadge,
        infoText,
      });
    });
  }

  createActionButtons() {
    const { width, height } = this.scale;
    const buttonWidth = 120;
    const buttonHeight = 45;

    // Bouton Reset (style enigma3)
    const resetShadow = this.add.rectangle(
      width / 2 - 70 + 3,
      height - 60 + 3,
      buttonWidth,
      buttonHeight,
      0x000000,
      0.5
    );

    const resetButton = this.add
      .rectangle(
        width / 2 - 70,
        height - 60,
        buttonWidth,
        buttonHeight,
        0x1a1a1a,
        0.9
      )
      .setStrokeStyle(3, 0xff4444, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.resetAssignments());

    const resetInner = this.add.rectangle(
      width / 2 - 70,
      height - 60,
      buttonWidth - 6,
      buttonHeight - 6,
      0x000000,
      0
    );
    resetInner.setStrokeStyle(1, 0xffffff, 0.2);

    const resetText = this.add
      .text(width / 2 - 70, height - 60, "↻ Reset", {
        fontSize: "16px",
        color: "#ff4444",
        fontStyle: "bold",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    // Effets hover bouton Reset
    resetButton.on("pointerover", () => {
      resetButton.setStrokeStyle(4, 0xff0000, 1);
      resetButton.setFillStyle(0xff4444, 0.2);
      this.tweens.add({
        targets: [resetButton, resetText, resetInner, resetShadow],
        scale: 1.05,
        duration: 200,
        ease: "Power2",
      });
    });

    resetButton.on("pointerout", () => {
      resetButton.setStrokeStyle(3, 0xff4444, 0.8);
      resetButton.setFillStyle(0x1a1a1a, 0.9);
      this.tweens.add({
        targets: [resetButton, resetText, resetInner, resetShadow],
        scale: 1,
        duration: 200,
        ease: "Power2",
      });
    });

    // Bouton Valider (style enigma3)
    const validateShadow = this.add.rectangle(
      width / 2 + 70 + 3,
      height - 60 + 3,
      buttonWidth,
      buttonHeight,
      0x000000,
      0.5
    );

    const validateButton = this.add
      .rectangle(
        width / 2 + 70,
        height - 60,
        buttonWidth,
        buttonHeight,
        0x1a1a1a,
        0.9
      )
      .setStrokeStyle(3, 0x44ff44, 0.8)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.validateAssignments());

    const validateInner = this.add.rectangle(
      width / 2 + 70,
      height - 60,
      buttonWidth - 6,
      buttonHeight - 6,
      0x000000,
      0
    );
    validateInner.setStrokeStyle(1, 0xffffff, 0.2);

    const validateText = this.add
      .text(width / 2 + 70, height - 60, "✓ Valider", {
        fontSize: "16px",
        color: "#44ff44",
        fontStyle: "bold",
        fontFamily: "Arial",
      })
      .setOrigin(0.5);

    // Effets hover bouton Valider
    validateButton.on("pointerover", () => {
      validateButton.setStrokeStyle(4, 0x00ff88, 1);
      validateButton.setFillStyle(0x44ff44, 0.2);
      this.tweens.add({
        targets: [validateButton, validateText, validateInner, validateShadow],
        scale: 1.05,
        duration: 200,
        ease: "Power2",
      });
    });

    validateButton.on("pointerout", () => {
      validateButton.setStrokeStyle(3, 0x44ff44, 0.8);
      validateButton.setFillStyle(0x1a1a1a, 0.9);
      this.tweens.add({
        targets: [validateButton, validateText, validateInner, validateShadow],
        scale: 1,
        duration: 200,
        ease: "Power2",
      });
    });

    // Setup listeners at the end, after all elements are created
    this.server.listeners.onGameUpdate = this.onGameUpdate.bind(this);
  }

  startDrag(
    type,
    index,
    buttonElement,
    shadowElement,
    innerRectElement,
    infoBadge,
    infoText
  ) {
    console.log("startDrag", {
      type,
      index,
      used: this.typeButtons[index].used,
    });
    // Don't allow dragging from list if already used - must drag from slot instead
    if (this.typeButtons[index].used) return;
    this.isDragging = true;
    this.draggedType = type;
    this.draggedTypeIndex = index;
    // Style de drag (jaune)
    buttonElement.setStrokeStyle(4, 0xffff00, 1);
    buttonElement.setFillStyle(0xffff00, 0.2);
    buttonElement.setAlpha(0.8);
  }

  endDrag(
    buttonElement,
    textElement,
    shadowElement,
    innerRectElement,
    infoBadge,
    infoText,
    originalX,
    originalY,
    buttonWidth,
    buttonHeight
  ) {
    console.log("endDrag", {
      isDragging: this.isDragging,
      draggedType: this.draggedType,
    });
    // Retour à la position originale
    buttonElement.x = originalX;
    buttonElement.y = originalY;
    textElement.x = originalX;
    textElement.y = originalY;
    shadowElement.x = originalX + 3;
    shadowElement.y = originalY + 3;
    innerRectElement.x = originalX;
    innerRectElement.y = originalY;
    infoBadge.x = originalX + buttonWidth / 2 - 15;
    infoBadge.y = originalY - buttonHeight / 2 + 15;
    infoText.x = originalX + buttonWidth / 2 - 15;
    infoText.y = originalY - buttonHeight / 2 + 15;

    // Retour au style normal (enigma3)
    buttonElement.setAlpha(1);
    buttonElement.setStrokeStyle(3, 0xffd700, 0.8);
    buttonElement.setFillStyle(0x1a1a1a, 0.9);

    this.isDragging = false;
    this.draggedType = null;
    this.draggedTypeIndex = null;
  }

  startDragFromSlot(type, slotIndex, textElement) {
    console.log("startDragFromSlot", { type, slotIndex });
    this.isDragging = true;
    this.draggedFromSlot = true;
    this.draggedFromSlotIndex = slotIndex;
    this.draggedType = type;
    textElement.setAlpha(0.7);
  }

  endDragFromSlot(textElement) {
    console.log("endDragFromSlot", {
      draggedType: this.draggedType,
      draggedFromSlotIndex: this.draggedFromSlotIndex,
    });
    // Reset position
    textElement.x = textElement.originalX;
    textElement.y = textElement.originalY;
    textElement.setAlpha(1);

    // Clear the original slot if drop didn't happen
    // (if drop happened, the slot will be updated by server response)

    this.isDragging = false;
    this.draggedFromSlot = false;
    this.draggedType = null;
    this.draggedFromSlotIndex = null;
  }

  assignTypeToSlot(slotIndex, draggedType) {
    console.log("assignTypeToSlot", {
      slotIndex,
      draggedType,
      draggedFromSlot: this.draggedFromSlot,
      draggedFromSlotIndex: this.draggedFromSlotIndex,
    });
    if (!draggedType) return;

    // If dragging from another slot, clear the original slot first
    if (this.draggedFromSlot && this.draggedFromSlotIndex !== null) {
      // Clear the original slot
      this.server.enigma2.update(this.draggedFromSlotIndex, "");
    }

    // Emit update to server - UI will update when server confirms
    this.server.enigma2.update(slotIndex, draggedType);
  }

  validateAssignments() {
    // Submit to server for validation
    this.server.enigma2.submit();
  }

  resetAssignments() {
    // Emit single reset event to server - UI will update when server confirms
    this.server.enigma2.reset();

    this.draggedType = null;
    this.draggedTypeIndex = null;
    this.isDragging = false;
  }

  updateScore() {
    // Score display removed - keeping function for compatibility
  }

  showMessage(text, color) {
    const { width } = this.scale;
    if (this.messageText) this.messageText.destroy();
    if (this.messageBg) this.messageBg.destroy();

    // Background pour le message (style enigma3)
    this.messageBg = this.add.rectangle(width / 2, 100, 600, 80, 0x000000, 0.9);
    this.messageBg.setStrokeStyle(
      3,
      color === "#00ff00" ? 0x00ff88 : 0xff4444,
      1
    );
    this.messageBg.setDepth(200);

    this.messageText = this.add
      .text(width / 2, 100, text, {
        fontSize: "20px",
        color: color,
        align: "center",
        fontStyle: "bold",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 3,
        wordWrap: { width: 550 },
      })
      .setOrigin(0.5)
      .setDepth(201);

    // Animation d'apparition
    this.tweens.add({
      targets: [this.messageBg, this.messageText],
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1 },
      duration: 300,
      ease: "Back.easeOut",
    });

    this.time.delayedCall(3000, () => {
      if (this.messageText) {
        this.tweens.add({
          targets: [this.messageBg, this.messageText],
          alpha: 0,
          scale: 0.8,
          duration: 300,
          onComplete: () => {
            if (this.messageText) this.messageText.destroy();
            if (this.messageBg) this.messageBg.destroy();
            this.messageText = null;
            this.messageBg = null;
          },
        });
      }
    });
  }

  showLightingInfo(type) {
    // Définir les informations pour chaque type d'éclairage
    const lightingInfo = {
      "Éclairage 3 points": {
        title: "Éclairage 3 points",
        description:
          "L'éclairage classique du cinéma utilisant trois sources lumineuses :\n\n• Key Light (lumière principale)\n• Fill Light (lumière d'appoint)\n• Back Light (contre-jour)\n\nPermet un contrôle total du modelé et du relief.",
      },
      "Low-key (film noir)": {
        title: "Low-key (Film Noir)",
        description:
          "Technique d'éclairage dramatique caractérisée par :\n\n• Forts contrastes entre ombres et lumières\n• Dominance des zones sombres\n• Ombres marquées et profondes\n\nCrée une atmosphère mystérieuse et tendue.",
      },
      "High-key": {
        title: "High-key",
        description:
          "Éclairage lumineux et uniforme caractérisé par :\n\n• Peu de contrastes\n• Tonalités claires dominantes\n• Ombres douces et minimales\n\nIdéal pour les comédies et ambiances joyeuses.",
      },
      "Contre-jour": {
        title: "Contre-jour",
        description:
          "Technique où la source lumineuse est placée derrière le sujet :\n\n• Crée une silhouette sombre\n• Halo lumineux autour du sujet\n• Forte séparation du fond\n\nEffet dramatique et artistique.",
      },
      "Lumière naturelle": {
        title: "Lumière naturelle",
        description:
          "Utilisation de la lumière du jour sans artifice :\n\n• Aspect réaliste et authentique\n• Variations selon l'heure et la météo\n• Douceur et naturel\n\nStyle documentaire et réaliste.",
      },
    };

    const info = lightingInfo[type];
    if (!info) return;

    const { width, height } = this.scale;

    // Fond sombre semi-transparent pour bloquer les interactions
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.8
    );
    overlay.setDepth(300);
    overlay.setInteractive();

    // Panneau d'information
    const panelWidth = 600;
    const panelHeight = 350;

    // Ombre du panneau
    const panelShadow = this.add.rectangle(
      width / 2 + 5,
      height / 2 + 5,
      panelWidth,
      panelHeight,
      0x000000,
      0.7
    );
    panelShadow.setDepth(301);

    // Fond du panneau
    const panelBg = this.add.rectangle(
      width / 2,
      height / 2,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.95
    );
    panelBg.setStrokeStyle(4, 0x4a90e2, 1);
    panelBg.setDepth(302);

    // Bordure intérieure
    const innerBorder = this.add.rectangle(
      width / 2,
      height / 2,
      panelWidth - 8,
      panelHeight - 8,
      0x000000,
      0
    );
    innerBorder.setStrokeStyle(2, 0xffd700, 0.5);
    innerBorder.setDepth(303);

    // Titre
    const titleText = this.add
      .text(width / 2, height / 2 - 130, info.title, {
        fontSize: "28px",
        fontStyle: "bold",
        color: "#FFD700",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(304);

    // Description
    const descText = this.add
      .text(width / 2, height / 2 - 70, info.description, {
        fontSize: "16px",
        color: "#FFFFFF",
        fontFamily: "Arial",
        align: "left",
        lineSpacing: 8,
        wordWrap: { width: panelWidth - 80 },
      })
      .setOrigin(0.5, 0)
      .setDepth(304);

    // Bouton Fermer
    const closeButtonWidth = 120;
    const closeButtonHeight = 45;

    const closeShadow = this.add.rectangle(
      width / 2 + 3,
      height / 2 + 145 + 3,
      closeButtonWidth,
      closeButtonHeight,
      0x000000,
      0.5
    );
    closeShadow.setDepth(303);

    const closeButton = this.add.rectangle(
      width / 2,
      height / 2 + 145,
      closeButtonWidth,
      closeButtonHeight,
      0x1a1a1a,
      0.9
    );
    closeButton.setStrokeStyle(3, 0x4a90e2, 0.8);
    closeButton.setDepth(304);
    closeButton.setInteractive({ useHandCursor: true });

    const closeInner = this.add.rectangle(
      width / 2,
      height / 2 + 145,
      closeButtonWidth - 6,
      closeButtonHeight - 6,
      0x000000,
      0
    );
    closeInner.setStrokeStyle(1, 0xffffff, 0.2);
    closeInner.setDepth(304);

    const closeText = this.add
      .text(width / 2, height / 2 + 145, "✕ Fermer", {
        fontSize: "16px",
        color: "#4a90e2",
        fontStyle: "bold",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setDepth(305);

    // Effet hover sur le bouton
    closeButton.on("pointerover", () => {
      closeButton.setStrokeStyle(4, 0x6ab0ff, 1);
      closeButton.setFillStyle(0x4a90e2, 0.2);
      this.tweens.add({
        targets: [closeButton, closeText, closeInner, closeShadow],
        scale: 1.05,
        duration: 200,
        ease: "Power2",
      });
    });

    closeButton.on("pointerout", () => {
      closeButton.setStrokeStyle(3, 0x4a90e2, 0.8);
      closeButton.setFillStyle(0x1a1a1a, 0.9);
      this.tweens.add({
        targets: [closeButton, closeText, closeInner, closeShadow],
        scale: 1,
        duration: 200,
        ease: "Power2",
      });
    });

    // Fonction pour fermer le panneau
    const closePanel = () => {
      this.tweens.add({
        targets: [
          overlay,
          panelShadow,
          panelBg,
          innerBorder,
          titleText,
          descText,
          closeButton,
          closeInner,
          closeShadow,
          closeText,
        ],
        alpha: 0,
        scale: 0.8,
        duration: 300,
        ease: "Back.easeIn",
        onComplete: () => {
          overlay.destroy();
          panelShadow.destroy();
          panelBg.destroy();
          innerBorder.destroy();
          titleText.destroy();
          descText.destroy();
          closeButton.destroy();
          closeInner.destroy();
          closeShadow.destroy();
          closeText.destroy();
        },
      });
    };

    closeButton.on("pointerdown", closePanel);
    overlay.on("pointerdown", closePanel);

    // Animation d'apparition
    this.tweens.add({
      targets: [
        overlay,
        panelShadow,
        panelBg,
        innerBorder,
        titleText,
        descText,
        closeButton,
        closeInner,
        closeShadow,
        closeText,
      ],
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1 },
      duration: 400,
      ease: "Back.easeOut",
    });
  }

  showSuccessModal() {
    const { width, height } = this.scale;

    // Fond sombre semi-transparent qui bloque toutes les interactions
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.85
    );
    overlay.setDepth(400);
    overlay.setInteractive();

    // Dimensions du panneau de succès
    const panelWidth = 700;
    const panelHeight = 450;

    // Ombre du panneau
    const panelShadow = this.add.rectangle(
      width / 2 + 6,
      height / 2 + 6,
      panelWidth,
      panelHeight,
      0x000000,
      0.8
    );
    panelShadow.setDepth(401);

    // Fond du panneau avec gradient simulé
    const panelBg = this.add.rectangle(
      width / 2,
      height / 2,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.98
    );
    panelBg.setStrokeStyle(5, 0x00ff88, 1);
    panelBg.setDepth(402);

    // Bordure intérieure dorée
    const innerBorder = this.add.rectangle(
      width / 2,
      height / 2,
      panelWidth - 10,
      panelHeight - 10,
      0x000000,
      0
    );
    innerBorder.setStrokeStyle(3, 0xffd700, 0.6);
    innerBorder.setDepth(403);

    // Icône de succès (étoile ou checkmark)
    const successIcon = this.add
      .text(width / 2, height / 2 - 170, "✓", {
        fontSize: "80px",
        color: "#00ff88",
        fontStyle: "bold",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(404);

    // Animation de pulsation pour l'icône
    this.tweens.add({
      targets: successIcon,
      scale: { from: 0.8, to: 1.1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Titre de succès
    const titleText = this.add
      .text(width / 2, height / 2 - 90, "ÉNIGME RÉSOLUE !", {
        fontSize: "36px",
        fontStyle: "bold",
        color: "#FFD700",
        fontFamily: "Arial Black",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(404);

    // Texte éducatif sur l'importance de l'éclairage
    const educationalText = `L'éclairage est l'un des piliers fondamentaux du langage cinématographique.

Chaque type d'éclairage crée une atmosphère unique et influence profondément
les émotions du spectateur. Le choix du bon éclairage transforme une scène
ordinaire en moment cinématographique mémorable.

Du film noir dramatique à la comédie lumineuse, en passant par le réalisme
documentaire, maîtriser l'éclairage c'est maîtriser l'art de raconter des
histoires en images.

Félicitations pour avoir complété cette énigme !`;

    const descText = this.add
      .text(width / 2, height / 2 - 20, educationalText, {
        fontSize: "15px",
        color: "#FFFFFF",
        fontFamily: "Arial",
        align: "center",
        lineSpacing: 6,
        wordWrap: { width: panelWidth - 100 },
      })
      .setOrigin(0.5)
      .setDepth(404);

    // Bouton Valider l'équipe
    const buttonWidth = 280;
    const buttonHeight = 55;
    const buttonY = height / 2 + 165;

    // Ombre du bouton
    const buttonShadow = this.add.rectangle(
      width / 2 + 4,
      buttonY + 4,
      buttonWidth,
      buttonHeight,
      0x000000,
      0.6
    );
    buttonShadow.setDepth(403);

    // Fond du bouton
    const validateButton = this.add.rectangle(
      width / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x00ff88,
      1
    );
    validateButton.setStrokeStyle(4, 0xffd700, 1);
    validateButton.setDepth(404);
    validateButton.setInteractive({ useHandCursor: true });

    // Bordure intérieure du bouton
    const buttonInner = this.add.rectangle(
      width / 2,
      buttonY,
      buttonWidth - 8,
      buttonHeight - 8,
      0x000000,
      0
    );
    buttonInner.setStrokeStyle(2, 0xffffff, 0.3);
    buttonInner.setDepth(404);

    // Texte du bouton
    const buttonText = this.add
      .text(width / 2, buttonY, "✓ Valider l'équipe", {
        fontSize: "22px",
        color: "#000000",
        fontStyle: "bold",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5)
      .setDepth(405);

    // Effets hover sur le bouton
    validateButton.on("pointerover", () => {
      validateButton.setFillStyle(0x00ffaa, 1);
      validateButton.setStrokeStyle(5, 0xffff00, 1);
      this.tweens.add({
        targets: [validateButton, buttonText, buttonInner, buttonShadow],
        scale: 1.08,
        duration: 200,
        ease: "Power2",
      });
    });

    validateButton.on("pointerout", () => {
      validateButton.setFillStyle(0x00ff88, 1);
      validateButton.setStrokeStyle(4, 0xffd700, 1);
      this.tweens.add({
        targets: [validateButton, buttonText, buttonInner, buttonShadow],
        scale: 1,
        duration: 200,
        ease: "Power2",
      });
    });

    // Action du bouton : marquer l'énigme comme complétée et retourner à la page principale
    validateButton.on("pointerdown", () => {
      // Animation de clic
      this.tweens.add({
        targets: [validateButton, buttonText, buttonInner, buttonShadow],
        scale: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          // Fermer la modale avec animation
          this.tweens.add({
            targets: [
              overlay,
              panelShadow,
              panelBg,
              innerBorder,
              successIcon,
              titleText,
              descText,
              validateButton,
              buttonInner,
              buttonShadow,
              buttonText,
            ],
            alpha: 0,
            scale: 0.8,
            duration: 400,
            ease: "Back.easeIn",
            onComplete: () => {
              // L'énigme a déjà été validée côté serveur
              // Retour à la screngarde dans les autres ène principale via le serveur
              this.server.changeScene("main");
            },
          });
        },
      });
    });

    // Animation d'apparition de la modale
    this.tweens.add({
      targets: [overlay],
      alpha: { from: 0, to: 0.85 },
      duration: 300,
    });

    this.tweens.add({
      targets: [
        panelShadow,
        panelBg,
        innerBorder,
        successIcon,
        titleText,
        descText,
        validateButton,
        buttonInner,
        buttonShadow,
        buttonText,
      ],
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1 },
      duration: 500,
      ease: "Back.easeOut",
    });
  }
}
