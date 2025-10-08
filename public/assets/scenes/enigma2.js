class Enigma2Scene extends Phaser.Scene {
  constructor() {
    super({ key: "Enigma2" });
    this.draggedType = null;
    this.isDragging = false;
    this.score = 0;
    this.totalPhotos = 5;
    this.typeSlots = [];
    this.typeButtons = [];
  }

  preload() {
    this.load.image("photo1", "assets/images/lumieres/scene1filtre1.png");
    this.load.image("photo2", "assets/images/lumieres/scene1filtre2.png");
    this.load.image("photo3", "assets/images/lumieres/scene1filtre3.png");
    this.load.image("photo4", "assets/images/lumieres/scene1filtre4.png");
    this.load.image("photo5", "assets/images/lumieres/scene1ok.jpg");
    this.load.image("background", "assets/images/lumieres/lightning-bg.png");
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
      }
    );

    this.createPhotosWithSlots();
    this.createTypesPanel();
    this.createActionButtons();
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
          0x333333
        )
        .setStrokeStyle(2, 0x666666);

      const slotText = this.add
        .text(x + photoWidth / 2, y + photoHeight + 25, "Déposez ici", {
          fontSize: "12px",
          color: "#999999",
        })
        .setOrigin(0.5);

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
      if (this.isDragging && this.draggedType != null) {
        this.assignTypeToSlot(dropZone.slotIndex);
      }
    });
  }

  createTypesPanel() {
    const { width, height } = this.scale;
    const types = [
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
        0xaa2222
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
        0x22aa22
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
  }

  startDrag(type, index, buttonElement) {
    if (this.typeButtons[index].used) return;
    this.isDragging = true;
    this.draggedType = type;
    this.draggedTypeIndex = index;
    buttonElement.setStrokeStyle(3, 0xffff00);
    buttonElement.setAlpha(0.7);
  }

  endDrag(buttonElement, textElement, originalX, originalY) {
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

  assignTypeToSlot(slotIndex) {
    if (!this.draggedType) return;
    const slot = this.typeSlots[slotIndex];

    // Supprime ancienne assignation
    if (slot.assignedType !== null) {
      const oldTypeButton = this.typeButtons.find(
        (btn) => btn.type === slot.assignedType
      );
      if (oldTypeButton) {
        oldTypeButton.used = false;
        oldTypeButton.background.setFillStyle(0x444444);
        oldTypeButton.text.setAlpha(1);
      }
    }

    // Nouvelle assignation
    slot.assignedType = this.draggedType;
    slot.text.setText(this.draggedType);
    slot.text.setColor("#ffffff");
    slot.background.setFillStyle(0x004422);

    const typeButton = this.typeButtons[this.draggedTypeIndex];
    typeButton.used = true;
    typeButton.background.setFillStyle(0x666666);
    typeButton.text.setAlpha(0.6);

    this.draggedType = null;
    this.draggedTypeIndex = null;
    this.isDragging = false;
    this.updateScore();
  }

  validateAssignments() {
    let correctAssignments = 0;
    this.typeSlots.forEach((slot, index) => {
      const correctType = this.photoData[index].type;
      if (slot.assignedType === correctType) {
        correctAssignments++;
        slot.background.setFillStyle(0x00aa00);
      } else {
        slot.background.setFillStyle(0xaa0000);
      }
    });

    this.score = correctAssignments;
    this.updateScore();

    if (correctAssignments === this.totalPhotos) {
      this.showMessage(
        "Parfait ! Toutes les associations sont correctes!",
        "#00ff00"
      );
    } else {
      this.showMessage(
        `${correctAssignments}/${this.totalPhotos} correct(es)`,
        "#ffaa00"
      );
    }
  }

  resetAssignments() {
    this.typeSlots.forEach((slot) => {
      slot.assignedType = null;
      slot.text.setText("Déposez ici");
      slot.text.setColor("#999999");
      slot.background.setFillStyle(0x333333);
    });
    this.typeButtons.forEach((typeButton) => {
      typeButton.used = false;
      typeButton.background.setFillStyle(0x444444);
      typeButton.text.setAlpha(1);
    });
    this.draggedType = null;
    this.draggedTypeIndex = null;
    this.isDragging = false;
    this.score = 0;
    this.updateScore();
  }

  updateScore() {
    const count = this.typeSlots.filter(
      (slot) => slot.assignedType !== null
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
