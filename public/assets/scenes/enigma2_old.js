class Enigma2Sceneddd extends Phaser.Scene {
  constructor() {
    super({ key: "Enigma2" });
    this.photos = [];
    this.selectedType = null;
    this.draggedType = null;
    this.draggedTypeIndex = null;
    this.isDragging = false;
    this.score = 0;
    this.totalPhotos = 6;
    this.photoImages = [];
    this.typeSlots = [];
    this.typeButtons = [];
    this.assignments = {}; // Store photo-type assignments
  }

  preload() {
    // Charger les 6 photos avec différents éclairages
    this.load.image("photo1", "assets/images/storyboard/image1.png");
    this.load.image("photo2", "assets/images/storyboard/image2.png");
    this.load.image("photo3", "assets/images/storyboard/image3.png");
    this.load.image("photo4", "assets/images/storyboard/image4.png");
    this.load.image("photo5", "assets/images/storyboard/image5.png");
    this.load.image("photo6", "assets/images/storyboard/image6.png");

    this.load.image("background", "assets/images/waiting_room_bg.jpg");
  }

  create() {
    // Background
    this.add.image(400, 300, "background").setScale(0.8);

    // Configuration des photos et leurs types d'éclairage
    this.photoData = [
      { key: "photo1", type: "Éclairage 3 points" },
      { key: "photo2", type: "Low-key (film noir)" },
      { key: "photo3", type: "High-key" },
      { key: "photo4", type: "Contre-jour" },
      { key: "photo5", type: "Lumière naturelle" },
      { key: "photo6", type: "Éclairage latéral" },
    ];

    this.createUI();
  }

  createUI() {
    // Titre simple
    this.add
      .text(this.scale.width / 2, 40, "ÉNIGME DE L'ÉCLAIRAGE", {
        fontSize: "28px",
        color: "#ffcc00",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        70,
        "Glissez les types vers les slots sous les photos",
        {
          fontSize: "16px",
          color: "#ffffff",
        }
      )
      .setOrigin(0.5);

    // Score simple
    this.scoreText = this.add.text(
      30,
      25,
      `Associations: ${this.score}/${this.totalPhotos}`,
      {
        fontSize: "18px",
        color: "#ffcc00",
        fontStyle: "bold",
      }
    );

    // Créer les éléments
    this.createPhotosWithSlots();
    this.createTypesPanel();
    this.createActionButtons();
  }

  createPhotosWithSlots() {
    // Configuration simple
    const cols = 3;
    const rows = 2;
    const photoWidth = 150;
    const photoHeight = 120;
    const slotHeight = 40;
    const spacing = 20;
    const startX = 100;
    const startY = 150;

    // Position centrale
    const gridWidth = cols * photoWidth + (cols - 1) * spacing;
    const gridHeight =
      rows * (photoHeight + slotHeight + slotGap) + (rows - 1) * marginY;
    const startX = (availableWidth - gridWidth) / 2 + marginX;
    const startY = (screenHeight - gridHeight) / 2;

    this.photoData.forEach((photoData, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = startX + col * (photoWidth + spacing);
      const y = startY + row * (photoHeight + slotHeight + slotGap + marginY);

      const photoY = y;
      const slotY = y + photoHeight + slotGap;

      // === PHOTO AVEC EFFETS VISUELS ===
      const photoContainer = this.add.container(
        x + photoWidth / 2,
        photoY + photoHeight / 2
      );

      // Ombre portée
      const shadow = this.add.rectangle(
        3,
        3,
        photoWidth + 8,
        photoHeight + 8,
        0x000000,
        0.3
      );

      // Bordure principale avec dégradé
      const border = this.add
        .rectangle(0, 0, photoWidth + 8, photoHeight + 8, 0x2a2a3a)
        .setStrokeStyle(3, 0xffcc00);

      // Bordure intérieure
      const innerBorder = this.add
        .rectangle(0, 0, photoWidth + 2, photoHeight + 2, 0x1a1a2a)
        .setStrokeStyle(1, 0x666677);

      // Image de la photo avec effet
      const photoImage = this.add
        .image(0, 0, photoData.key)
        .setDisplaySize(photoWidth, photoHeight)
        .setTint(0xf0f0f0); // Légère teinte pour adoucir

      // Badge de numéro stylisé (agrandi)
      const labelFontSize = Math.max(16, Math.min(20, photoWidth / 8)); // Plus gros
      const badgeBg = this.add.circle(
        photoWidth / 2 - 18,
        -photoHeight / 2 + 18,
        16, // Plus gros badge
        0xffcc00
      );
      const badgeBorder = this.add
        .circle(photoWidth / 2 - 18, -photoHeight / 2 + 18, 16)
        .setStrokeStyle(3, 0xff9900);
      const photoLabel = this.add
        .text(photoWidth / 2 - 18, -photoHeight / 2 + 18, `${index + 1}`, {
          fontSize: `${labelFontSize}px`,
          color: "#000000",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      photoContainer.add([
        shadow,
        border,
        innerBorder,
        photoImage,
        badgeBg,
        badgeBorder,
        photoLabel,
      ]);

      // Animation d'entrée
      photoContainer.setScale(0);
      this.tweens.add({
        targets: photoContainer,
        scale: 1,
        duration: 500,
        ease: "Back.easeOut",
        delay: index * 100,
      });

      // === SLOT STYLISÉ ===
      // Ombre du slot
      const slotShadow = this.add.rectangle(
        x + photoWidth / 2 + 2,
        slotY + slotHeight / 2 + 2,
        photoWidth,
        slotHeight,
        0x000000,
        0.3
      );

      const slotBg = this.add
        .rectangle(
          x + photoWidth / 2,
          slotY + slotHeight / 2,
          photoWidth,
          slotHeight,
          0x2a2a3a
        )
        .setStrokeStyle(2, 0x555577)
        .setInteractive({
          useHandCursor: true,
          dropZone: true,
        })
        .on("drop", (pointer, gameObject) => {
          if (this.isDragging && this.draggedType) {
            this.assignTypeToSlot(index);
          }
        })
        .on("dragenter", (pointer, gameObject) => {
          if (this.isDragging) {
            slotBg.setStrokeStyle(3, 0x00ff88);
            slotBg.setFillStyle(0x003322);
          }
        })
        .on("dragleave", (pointer, gameObject) => {
          if (this.typeSlots[index] && this.typeSlots[index].assignedType) {
            slotBg.setStrokeStyle(2, 0x00aa44);
            slotBg.setFillStyle(0x004422);
          } else {
            slotBg.setStrokeStyle(2, 0x555577);
            slotBg.setFillStyle(0x2a2a3a);
          }
        })
        .on("pointerover", () => {
          if (this.isDragging) {
            slotBg.setStrokeStyle(3, 0x00ff88);
            slotBg.setFillStyle(0x003322);
          } else {
            slotBg.setStrokeStyle(3, 0xffaa00);
            slotBg.setFillStyle(0x333311);
          }
        })
        .on("pointerout", () => {
          if (this.typeSlots[index] && this.typeSlots[index].assignedType) {
            slotBg.setStrokeStyle(2, 0x00aa44);
            slotBg.setFillStyle(0x004422);
          } else {
            slotBg.setStrokeStyle(2, 0x555577);
            slotBg.setFillStyle(0x2a2a3a);
          }
        });

      // Icône de drop zone (sans emoji)
      const dropIcon = this.add
        .text(x + photoWidth / 2, slotY + slotHeight / 2 - 10, "↓", {
          fontSize: "20px",
          color: "#666688",
        })
        .setOrigin(0.5);

      // Texte du slot (plus gros)
      const slotFontSize = Math.max(14, Math.min(16, photoWidth / 12)); // Plus gros
      const slotText = this.add
        .text(
          x + photoWidth / 2,
          slotY + slotHeight / 2 + 10,
          "Déposez le type ici",
          {
            fontSize: `${slotFontSize}px`,
            color: "#999999",
            align: "center",
            wordWrap: { width: photoWidth - 10 },
          }
        )
        .setOrigin(0.5);

      // Stocker les références
      this.photoImages.push({
        container: photoContainer,
        border,
        image: photoImage,
        index,
      });

      this.typeSlots.push({
        background: slotBg,
        text: slotText,
        assignedType: null,
        index,
      });
    });
  }

  createTypesPanel() {
    const types = [
      "Éclairage 3 points",
      "Low-key (film noir)",
      "High-key",
      "Contre-jour",
      "Lumière naturelle",
      "Éclairage latéral",
    ];

    // Configuration responsive du panneau
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const panelWidth = Math.min(200, screenWidth * 0.25);
    const panelX = screenWidth - panelWidth / 2 - 20;

    // Calcul de l'espace disponible pour les boutons (plus grands)
    const availableHeight = screenHeight - 200; // Marge haut/bas
    const buttonSpacing = Math.min(80, availableHeight / (types.length + 1)); // Plus d'espacement
    const buttonHeight = Math.min(60, buttonSpacing * 0.75); // Plus hauts
    const buttonWidth = panelWidth - 20;

    const panelStartY = (screenHeight - types.length * buttonSpacing) / 2;

    // Panel de fond avec bordure
    const panelBg = this.add
      .rectangle(
        panelX,
        panelStartY + (types.length * buttonSpacing) / 2,
        panelWidth + 10,
        types.length * buttonSpacing + 120,
        0x1a1a2a,
        0.8
      )
      .setStrokeStyle(2, 0xffcc00);

    // Titre du panneau (sans emoji)
    const titleFontSize = Math.min(24, Math.max(20, screenWidth / 40)); // Plus gros
    const titleText = this.add
      .text(panelX, panelStartY - 70, "TYPES D'ÉCLAIRAGE", {
        fontSize: `${titleFontSize}px`,
        color: "#ffcc00",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    // Instruction stylisée (plus grosse)
    const instructionFontSize = Math.min(18, Math.max(14, screenWidth / 60)); // Plus gros
    const instructionBg = this.add
      .rectangle(panelX, panelStartY - 45, panelWidth - 10, 30, 0x333344, 0.7) // Plus haut
      .setStrokeStyle(2, 0x666677);

    this.add
      .text(panelX, panelStartY - 45, "Glissez vers les slots", {
        fontSize: `${instructionFontSize}px`,
        color: "#cccccc",
      })
      .setOrigin(0.5, 0);

    // Animation du titre
    this.tweens.add({
      targets: titleText,
      y: titleText.y - 3,
      duration: 1500,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    types.forEach((type, index) => {
      const y = panelStartY + index * buttonSpacing;

      // Ombre du bouton
      const buttonShadow = this.add.rectangle(
        panelX + 2,
        y + 2,
        buttonWidth,
        buttonHeight,
        0x000000,
        0.4
      );

      // Background du bouton type avec gradient effect
      const typeBg = this.add
        .rectangle(panelX, y, buttonWidth, buttonHeight, 0x3a3a4a)
        .setStrokeStyle(2, 0x555577)
        .setInteractive({
          useHandCursor: true,
          draggable: true,
        })
        .on("dragstart", (pointer, dragX, dragY) => {
          if (!this.typeButtons[index].used) {
            this.startDrag(type, index, typeBg);
          }
        })
        .on("drag", (pointer, dragX, dragY) => {
          if (this.isDragging) {
            typeBg.x = dragX;
            typeBg.y = dragY;
          }
        })
        .on("dragend", (pointer) => {
          this.endDrag(typeBg, panelX, y);
        })
        .on("pointerover", () => {
          if (!this.typeButtons[index].used) {
            typeBg.setStrokeStyle(3, 0xffaa00);
            typeBg.setFillStyle(0x4a4a5a);
            // Petit effet de scale
            this.tweens.add({
              targets: typeBg,
              scaleX: 1.05,
              scaleY: 1.05,
              duration: 100,
              ease: "Power2",
            });
          }
        })
        .on("pointerout", () => {
          if (!this.isDragging) {
            typeBg.setStrokeStyle(2, 0x555577);
            typeBg.setFillStyle(0x3a3a4a);
            this.tweens.add({
              targets: typeBg,
              scaleX: 1,
              scaleY: 1,
              duration: 100,
              ease: "Power2",
            });
          }
        });

      // Indicateur visuel simple (sans emoji)
      const indicator = this.add
        .circle(panelX - buttonWidth / 3, y, 6, 0xffcc00)
        .setStrokeStyle(2, 0xff9900);

      // Texte du type (plus gros)
      const textFontSize = Math.min(16, Math.max(12, buttonWidth / 14)); // Plus gros
      const typeText = this.add
        .text(panelX + 5, y, type, {
          fontSize: `${textFontSize}px`,
          color: "#ffffff",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: buttonWidth - 30 },
        })
        .setOrigin(0.5);

      // Animation d'entrée décalée
      typeBg.setAlpha(0);
      typeText.setAlpha(0);
      indicator.setAlpha(0);

      this.tweens.add({
        targets: [typeBg, typeText, indicator],
        alpha: 1,
        duration: 300,
        ease: "Power2.easeOut",
        delay: index * 150 + 800,
      });

      // Stocker les références
      this.typeButtons.push({
        background: typeBg,
        text: typeText,
        icon: indicator,
        shadow: buttonShadow,
        type: type,
        index: index,
        used: false,
      });
    });
  }

  createActionButtons() {
    // Configuration responsive (boutons plus grands)
    const buttonWidth = Math.min(150, this.scale.width * 0.15); // Plus larges
    const buttonHeight = Math.min(60, this.scale.height * 0.1); // Plus hauts
    const margin = 20;
    const spacing = 20;

    // Position des boutons en bas à gauche
    const resetX = margin + buttonWidth / 2;
    const validateX = resetX + buttonWidth + spacing;
    const buttonsY = this.scale.height - margin - buttonHeight / 2;

    // Ombres des boutons
    const resetShadow = this.add.rectangle(
      resetX + 3,
      buttonsY + 3,
      buttonWidth,
      buttonHeight,
      0x000000,
      0.4
    );
    const validateShadow = this.add.rectangle(
      validateX + 3,
      buttonsY + 3,
      buttonWidth,
      buttonHeight,
      0x000000,
      0.4
    );

    // Bouton Reset avec style amélioré
    const resetButton = this.add
      .rectangle(resetX, buttonsY, buttonWidth, buttonHeight, 0xaa2222)
      .setStrokeStyle(3, 0xff4444)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.resetAssignments();
        // Animation de clic
        this.tweens.add({
          targets: resetButton,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 100,
          yoyo: true,
          ease: "Power2",
        });
      })
      .on("pointerover", () => {
        resetButton.setFillStyle(0xcc2222);
        resetButton.setStrokeStyle(3, 0xff6666);
      })
      .on("pointerout", () => {
        resetButton.setFillStyle(0xaa2222);
        resetButton.setStrokeStyle(3, 0xff4444);
      });

    const resetFontSize = Math.min(20, Math.max(16, buttonWidth / 6)); // Plus gros
    this.add
      .text(resetX, buttonsY, "Reset", {
        fontSize: `${resetFontSize}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Bouton Valider avec style amélioré
    const validateButton = this.add
      .rectangle(validateX, buttonsY, buttonWidth, buttonHeight, 0x22aa22)
      .setStrokeStyle(3, 0x44ff44)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.validateAssignments();
        // Animation de clic
        this.tweens.add({
          targets: validateButton,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 100,
          yoyo: true,
          ease: "Power2",
        });
      })
      .on("pointerover", () => {
        validateButton.setFillStyle(0x22cc22);
        validateButton.setStrokeStyle(3, 0x66ff66);
      })
      .on("pointerout", () => {
        validateButton.setFillStyle(0x22aa22);
        validateButton.setStrokeStyle(3, 0x44ff44);
      });

    const validateFontSize = Math.min(20, Math.max(16, buttonWidth / 6)); // Plus gros
    this.add
      .text(validateX, buttonsY, "Valider", {
        fontSize: `${validateFontSize}px`,
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

    // Effet visuel de drag
    buttonElement.setStrokeStyle(3, 0xffff00);
    buttonElement.setAlpha(0.8);

    // Mettre le bouton au premier plan
    buttonElement.setDepth(1000);

    this.showMessage(`Glissez "${type}" vers un slot`, "#ffaa00");
  }

  endDrag(buttonElement, originalX, originalY) {
    // Remettre le bouton à sa position originale avec animation
    this.tweens.add({
      targets: buttonElement,
      x: originalX,
      y: originalY,
      alpha: 1,
      duration: 200,
      ease: "Power2.easeOut",
      onComplete: () => {
        buttonElement.setDepth(0);
        if (!this.typeButtons[this.draggedTypeIndex]?.used) {
          buttonElement.setStrokeStyle(2, 0x555577);
        }
      },
    });

    this.isDragging = false;
    this.draggedType = null;
    this.draggedTypeIndex = null;
  }

  selectType(type, index) {
    if (this.typeButtons[index].used) return;

    // Désélectionner le type précédent
    if (this.selectedType) {
      const prevIndex = this.typeButtons.findIndex(
        (btn) => btn.type === this.selectedType
      );
      if (prevIndex !== -1) {
        this.typeButtons[prevIndex].background.setStrokeStyle(2, 0x666666);
      }
    }

    // Sélectionner le nouveau type
    this.selectedType = type;
    this.typeButtons[index].background.setStrokeStyle(2, 0xffff00);

    // Indiquer visuellement que les slots sont disponibles
    this.typeSlots.forEach((slot) => {
      if (!slot.assignedType) {
        slot.background.setStrokeStyle(2, 0x00aaff);
      }
    });

    this.showMessage(
      `Type "${type}" sélectionné. Cliquez sur un slot pour l'assigner.`,
      "#ffaa00"
    );
  }

  assignTypeToSlot(slotIndex) {
    // Utiliser draggedType pour le drag and drop, ou selectedType pour compatibilité
    const typeToAssign = this.draggedType || this.selectedType;
    const typeIndex =
      this.draggedTypeIndex !== null
        ? this.draggedTypeIndex
        : this.typeButtons.findIndex((btn) => btn.type === this.selectedType);

    if (!typeToAssign) {
      this.showMessage(
        "Glissez un type d'éclairage depuis la liste de droite!",
        "#ff0000"
      );
      return;
    }

    const slot = this.typeSlots[slotIndex];

    // Supprimer l'ancienne assignation de ce slot si elle existe
    if (slot.assignedType !== null) {
      // Rendre le type précédent disponible à nouveau
      const oldTypeButton = this.typeButtons.find(
        (btn) => btn.type === slot.assignedType
      );
      if (oldTypeButton) {
        oldTypeButton.used = false;
        oldTypeButton.background.setFillStyle(0x3a3a4a);
        oldTypeButton.background.setStrokeStyle(2, 0x555577);
      }
    }

    // Supprimer l'assignation précédente de ce type si elle existe ailleurs
    const existingSlot = this.typeSlots.find(
      (s) => s.assignedType === typeToAssign
    );
    if (existingSlot && existingSlot !== slot) {
      existingSlot.assignedType = null;
      existingSlot.text.setText("Déposez le type ici");
      existingSlot.text.setColor("#999999");
      existingSlot.background.setFillStyle(0x2a2a3a);
      existingSlot.background.setStrokeStyle(2, 0x555577);
    }

    // Assigner le nouveau type au slot
    slot.assignedType = typeToAssign;
    slot.text.setText(typeToAssign);
    slot.text.setColor("#ffffff");
    slot.background.setFillStyle(0x004422);
    slot.background.setStrokeStyle(2, 0x00aa44);

    // Marquer le type comme utilisé
    if (typeIndex >= 0) {
      this.typeButtons[typeIndex].used = true;
      this.typeButtons[typeIndex].background.setFillStyle(0x666666);
      this.typeButtons[typeIndex].background.setStrokeStyle(2, 0x888888);
    }

    // Désélectionner/arrêter le drag
    this.selectedType = null;
    this.draggedType = null;
    this.draggedTypeIndex = null;
    this.isDragging = false;

    // Remettre les slots à la normale
    this.typeSlots.forEach((s) => {
      if (!s.assignedType) {
        s.background.setStrokeStyle(2, 0x555577);
        s.background.setFillStyle(0x2a2a3a);
      }
    });

    this.showMessage(`Type "${typeToAssign}" assigné !`, "#00aa44");

    this.updateScore();
    this.checkCompletion();
  }

  validateAssignments() {
    let correctAssignments = 0;
    let feedbackMessages = [];

    this.photoData.forEach((photoData, photoIndex) => {
      const slot = this.typeSlots[photoIndex];
      const assignedType = slot.assignedType;
      const correctType = photoData.type;

      if (assignedType) {
        if (assignedType === correctType) {
          correctAssignments++;
          slot.background.setFillStyle(0x00aa00); // Vert pour correct
        } else {
          slot.background.setFillStyle(0xaa0000); // Rouge pour incorrect
          feedbackMessages.push(`Photo ${photoIndex + 1}: ${correctType}`);
        }
      } else {
        feedbackMessages.push(
          `Photo ${photoIndex + 1}: manquant (${correctType})`
        );
      }
    });

    this.score = correctAssignments;
    this.updateScore();

    if (correctAssignments === this.totalPhotos) {
      this.showMessage(
        "Parfait ! Toutes les associations sont correctes!",
        "#00ff00"
      );
      this.time.delayedCall(3000, () => {
        this.showFinalResults();
      });
    } else {
      let message = `${correctAssignments}/${this.totalPhotos} correct(es)`;
      if (feedbackMessages.length > 0) {
        message += "\nCorrections:\n" + feedbackMessages.join("\n");
      }
      this.showMessage(message, "#ffaa00");
    }
  }

  checkCompletion() {
    // Vérifier automatiquement si toutes les photos ont un type assigné
    const allAssigned = this.typeSlots.every(
      (slot) => slot.assignedType !== null
    );

    if (allAssigned) {
      // Auto-validation après un court délai
      this.time.delayedCall(500, () => {
        this.validateAssignments();
      });
    }
  }

  resetAssignments() {
    // Réinitialiser toutes les assignations
    this.assignments = {};

    // Réinitialiser l'affichage des slots
    this.typeSlots.forEach((slot) => {
      slot.assignedType = null;
      slot.text.setText("Déposez le type ici");
      slot.text.setColor("#999999");
      slot.background.setFillStyle(0x2a2a3a);
      slot.background.setStrokeStyle(2, 0x555577);
    });

    // Réinitialiser les boutons de types
    this.typeButtons.forEach((typeButton) => {
      typeButton.used = false;
      typeButton.background.setFillStyle(0x3a3a4a);
      typeButton.background.setStrokeStyle(2, 0x555577);
    });

    // Réinitialiser toutes les sélections et le drag
    this.selectedType = null;
    this.draggedType = null;
    this.draggedTypeIndex = null;
    this.isDragging = false;

    this.score = 0;
    this.updateScore();
  }

  updateScore() {
    this.scoreText.setText(`Associations: ${this.score}/${this.totalPhotos}`);

    // Mise à jour de la barre de progression avec animation
    const progressWidth = (this.score / this.totalPhotos) * 200;
    this.tweens.add({
      targets: this.progressFill,
      width: progressWidth,
      duration: 500,
      ease: "Power2.easeOut",
    });

    // Animation du score si il augmente
    if (this.score > 0) {
      this.tweens.add({
        targets: this.scoreText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        ease: "Back.easeOut",
      });
    }
  }

  showMessage(message, color = "#ffffff") {
    if (this.messageText) {
      this.messageText.destroy();
    }
    if (this.messageBg) {
      this.messageBg.destroy();
    }

    // Background du message avec effet
    this.messageBg = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        450,
        100,
        0x1a1a2e,
        0.95
      )
      .setStrokeStyle(
        3,
        color === "#00ff00"
          ? 0x00ff00
          : color === "#ff0000"
          ? 0xff0000
          : 0xffcc00
      )
      .setOrigin(0.5)
      .setDepth(999);

    this.messageText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, message, {
        fontSize: "18px",
        color: color,
        align: "center",
        fontStyle: "bold",
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5)
      .setDepth(1000);

    // Animation d'apparition
    this.messageBg.setScale(0);
    this.messageText.setScale(0);

    this.tweens.add({
      targets: [this.messageBg, this.messageText],
      scale: 1,
      duration: 300,
      ease: "Back.easeOut",
    });

    // Animation de pulsation pour les messages importants
    if (color === "#00ff00" || color === "#ff0000") {
      this.tweens.add({
        targets: this.messageBg,
        scaleX: { from: 1, to: 1.05 },
        scaleY: { from: 1, to: 1.05 },
        duration: 1000,
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: 2,
      });
    }

    // Supprimer le message après 3 secondes avec animation
    this.time.delayedCall(3000, () => {
      if (this.messageText && this.messageBg) {
        this.tweens.add({
          targets: [this.messageText, this.messageBg],
          alpha: 0,
          scale: 0.8,
          duration: 200,
          ease: "Power2.easeIn",
          onComplete: () => {
            if (this.messageText) {
              this.messageText.destroy();
              this.messageText = null;
            }
            if (this.messageBg) {
              this.messageBg.destroy();
              this.messageBg = null;
            }
          },
        });
      }
    });
  }

  showFinalResults() {
    // Masquer tous les éléments de jeu
    this.children.removeAll(true);

    // Afficher les résultats finaux
    this.add
      .text(this.scale.width / 2, 200, "Énigme de l'éclairage terminée!", {
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    let resultMessage = `Score final: ${this.score}/${this.totalPhotos}`;
    let resultColor = "#ffff00";

    if (this.score === this.totalPhotos) {
      resultMessage += " - Parfait!";
      resultColor = "#00ff00";
    } else if (this.score >= this.totalPhotos * 0.7) {
      resultMessage += " - Bien joué!";
      resultColor = "#ffaa00";
    }

    this.add
      .text(this.scale.width / 2, 250, resultMessage, {
        fontSize: "24px",
        color: resultColor,
      })
      .setOrigin(0.5);

    const pedagogicalMessage =
      "L'éclairage raconte autant que les dialogues. Le 3-point lighting (key + fill + backlight) est la base du cinéma. Le low-key crée du mystère et du suspense, tandis que le high-key apporte de la légèreté et de la clarté.";

    this.add
      .text(this.scale.width / 2, 320, pedagogicalMessage, {
        fontSize: "16px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 600 },
      })
      .setOrigin(0.5);

    // Bouton retour au hall principal
    const backButton = this.add
      .rectangle(this.scale.width / 2, 450, 200, 50, 0x4a4a4a)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("Main"))
      .on("pointerover", () => backButton.setFillStyle(0x5a5a5a))
      .on("pointerout", () => backButton.setFillStyle(0x4a4a4a));

    this.add
      .text(this.scale.width / 2, 450, "Retour au hall", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  /**
   * Creates an enhanced animated background
   */
  createEnhancedBackground() {
    // Background principal avec gradient
    const bg1 = this.add.rectangle(
      0,
      0,
      this.scale.width,
      this.scale.height,
      0x0a0a15
    );
    bg1.setOrigin(0, 0);

    // Gradient overlay 1
    const gradient1 = this.add.rectangle(
      this.scale.width * 0.3,
      this.scale.height * 0.2,
      this.scale.width * 0.6,
      this.scale.height * 0.8,
      0x1a0a2e,
      0.4
    );

    // Gradient overlay 2
    const gradient2 = this.add.rectangle(
      this.scale.width * 0.7,
      this.scale.height * 0.6,
      this.scale.width * 0.4,
      this.scale.height * 0.5,
      0x16213e,
      0.3
    );

    // Animation douce des gradients
    this.tweens.add({
      targets: gradient1,
      alpha: { from: 0.4, to: 0.6 },
      scaleX: { from: 1, to: 1.1 },
      duration: 6000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: gradient2,
      alpha: { from: 0.3, to: 0.5 },
      rotation: { from: 0, to: Math.PI },
      duration: 10000,
      ease: "Linear",
      repeat: -1,
    });

    // Particules d'ambiance dorées
    for (let i = 0; i < 25; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(0, this.scale.height),
        Phaser.Math.Between(1, 4),
        0xffcc00,
        Phaser.Math.FloatBetween(0.1, 0.4)
      );

      this.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-150, 150),
        y: particle.y + Phaser.Math.Between(-100, 100),
        alpha: { from: particle.alpha, to: 0.1 },
        scale: { from: 1, to: 0.3 },
        duration: Phaser.Math.Between(4000, 8000),
        ease: "Sine.easeInOut",
        repeat: -1,
        yoyo: true,
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    // Lignes de lumière subtiles
    for (let i = 0; i < 5; i++) {
      const line = this.add.rectangle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(0, this.scale.height),
        2,
        Phaser.Math.Between(50, 200),
        0xffffff,
        Phaser.Math.FloatBetween(0.05, 0.15)
      );

      line.rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);

      this.tweens.add({
        targets: line,
        alpha: { from: line.alpha, to: 0 },
        duration: Phaser.Math.Between(3000, 6000),
        ease: "Sine.easeInOut",
        repeat: -1,
        yoyo: true,
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }
}
