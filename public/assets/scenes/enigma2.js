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
        "main": "Main",
        "enigma1": "Enigma1",
        "enigma2": "Enigma2",
        "enigma3": "Enigma3",
        "enigma4": "Enigma4",
        "finale": "Finale"
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
      this.timerText.setText(`⏱️ ${minutes}:${secs.toString().padStart(2, "0")}`);
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
          this.showMessage(
            "Parfait ! Toutes les associations sont correctes!",
            "#00ff00",
          );
        } else {
          this.showMessage(
            "Certaines associations sont incorrectes.",
            "#ffaa00",
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
        slot.text.setColor("#ffffff");
        slot.background.setFillStyle(0x004422);

        // Enable dragging when slot has content
        this.input.setDraggable(slot.text, true);
      } else {
        slot.assignedType = null;
        slot.text.setText("Déposez ici");
        slot.text.setColor("#999999");
        slot.background.setFillStyle(0x333333);

        // Disable dragging when slot is empty
        this.input.setDraggable(slot.text, false);
      }
    });

    // Update type buttons based on what's been used
    this.typeButtons.forEach((typeButton) => {
      // Check if this type is used (not empty string)
      const isUsed = photos.some((p) => p === typeButton.type);
      typeButton.used = isUsed;
      if (isUsed) {
        typeButton.background.setFillStyle(0x666666);
        typeButton.text.setAlpha(0.6);
      } else {
        typeButton.background.setFillStyle(0x444444);
        typeButton.text.setAlpha(1);
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

    // === Background ===
    this.add
      .image(width / 2, height / 2, "background")
      .setDisplaySize(width, height);

    // === Photos data ===
    this.photoData = [
      { key: "photo1", type: "Éclairage 3 points" },
      { key: "photo2", type: "Low-key (film noir)" },
      { key: "photo3", type: "High-key" },
      { key: "photo4", type: "Contre-jour" },
      { key: "photo5", type: "Lumière naturelle" },
    ];

    // === Title ===
    this.add
      .text(width / 2, 40, "ÉNIGME DE L'ÉCLAIRAGE", {
        fontSize: "26px",
        color: "#ffcc00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 70, "Associez chaque photo au bon type d’éclairage", {
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // === Score ===
    this.scoreText = this.add.text(
      30,
      25,
      `Associations: ${this.score}/${this.totalPhotos}`,
      {
        fontSize: "16px",
        color: "#ffcc00",
      },
    );

    // === Timer ===
    this.timerText = this.add
      .text(width - 20, 20, "", {
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(1, 0);

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

      // Slot
      const slotBg = this.add
        .rectangle(
          x + photoWidth / 2,
          y + photoHeight + 25,
          photoWidth,
          slotHeight,
          0x333333,
        )
        .setStrokeStyle(2, 0x666666);

      const slotText = this.add
        .text(x + photoWidth / 2, y + photoHeight + 25, "Déposez ici", {
          fontSize: "12px",
          color: "#999999",
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
      });
    });

    // Gestion du drop
    this.input.on("drop", (pointer, gameObject, dropZone) => {
      console.log("Drop event fired", {
        isDragging: this.isDragging,
        draggedType: this.draggedType,
        slotIndex: dropZone.slotIndex,
      });
      if (this.isDragging && this.draggedType != null) {
        this.assignTypeToSlot(dropZone.slotIndex, this.draggedType);
      }
    });

    // Global drag handlers for slot text elements
    this.input.on("dragstart", (pointer, gameObject) => {
      // Check if this is a slot text being dragged
      if (gameObject.slotIndex !== undefined) {
        const slot = this.typeSlots[gameObject.slotIndex];
        if (slot && slot.assignedType) {
          this.startDragFromSlot(slot.assignedType, gameObject.slotIndex, gameObject);
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
    const types =
      this.server?.state?.room?.Enigma2?.typesOrder || [
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

    // Titre
    this.add
      .text(startX, startY - 50, "TYPES D'ÉCLAIRAGE", {
        fontSize: "16px",
        color: "#ffcc00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    types.forEach((type, index) => {
      const y = startY + index * spacing;

      const typeBg = this.add
        .rectangle(startX, y, buttonWidth, buttonHeight, 0x444444)
        .setStrokeStyle(2, 0x666666)
        .setInteractive({ draggable: true, useHandCursor: true });

      const typeText = this.add
        .text(startX, y, type, {
          fontSize: "12px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: buttonWidth - 10 },
        })
        .setOrigin(0.5);

      typeBg.on("dragstart", () => this.startDrag(type, index, typeBg));
      typeBg.on("drag", (pointer, dragX, dragY) => {
        if (this.isDragging) {
          typeBg.x = dragX;
          typeBg.y = dragY;
          typeText.x = dragX;
          typeText.y = dragY;
        }
      });
      typeBg.on("dragend", () => this.endDrag(typeBg, typeText, startX, y));

      this.typeButtons.push({
        background: typeBg,
        text: typeText,
        type,
        index,
        used: false,
      });
    });
  }

  createActionButtons() {
    const { width, height } = this.scale;
    const buttonWidth = 100;
    const buttonHeight = 40;

    const resetButton = this.add
      .rectangle(
        width / 2 - 60,
        height - 60,
        buttonWidth,
        buttonHeight,
        0xaa2222,
      )
      .setStrokeStyle(2, 0xff4444)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.resetAssignments());
    this.add
      .text(width / 2 - 60, height - 60, "Reset", {
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const validateButton = this.add
      .rectangle(
        width / 2 + 60,
        height - 60,
        buttonWidth,
        buttonHeight,
        0x22aa22,
      )
      .setStrokeStyle(2, 0x44ff44)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.validateAssignments());
    this.add
      .text(width / 2 + 60, height - 60, "Valider", {
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Setup listeners at the end, after all elements are created
    this.server.listeners.onGameUpdate = this.onGameUpdate.bind(this);
  }

  startDrag(type, index, buttonElement) {
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
    buttonElement.setStrokeStyle(3, 0xffff00);
    buttonElement.setAlpha(0.7);
  }

  endDrag(buttonElement, textElement, originalX, originalY) {
    console.log("endDrag", {
      isDragging: this.isDragging,
      draggedType: this.draggedType,
    });
    buttonElement.x = originalX;
    buttonElement.y = originalY;
    textElement.x = originalX;
    textElement.y = originalY;
    buttonElement.setAlpha(1);
    buttonElement.setStrokeStyle(2, 0x666666);
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
    const count = this.typeSlots.filter(
      (slot) => slot.assignedType !== null,
    ).length;
    this.scoreText.setText(`Associations: ${count}/${this.totalPhotos}`);
  }

  showMessage(text, color) {
    const { width } = this.scale;
    if (this.messageText) this.messageText.destroy();
    this.messageText = this.add
      .text(width / 2, 100, text, {
        fontSize: "16px",
        color,
        align: "center",
      })
      .setOrigin(0.5);
    this.time.delayedCall(3000, () => {
      if (this.messageText) {
        this.messageText.destroy();
        this.messageText = null;
      }
    });
  }
}
