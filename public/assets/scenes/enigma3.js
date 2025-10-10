class Enigma3Scene extends Phaser.Scene {
  constructor() {
    super("Enigma3");

    // Définition des personnages et rôles
    this.characters = [
      {
        key: "rose",
        file: "Rose_Bukater.jpg",
        name: "Rose Bukater",
        description:
          "Héroïne. Jeune femme de la haute société, enfermée par les conventions et promise à un mariage de façade. Sa rencontre avec Jack déclenche un véritable arc de transformation : elle affirme sa volonté, choisit la liberté et agit avec courage face au naufrage.",
      },
      {
        key: "caledon",
        file: "Caledon Hockley.jpg",
        name: "Caledon Hockley",
        description:
          "Antagoniste. Fiancé de Rose, riche, contrôlant et possessif. Il incarne la violence symbolique de la classe sociale et s'oppose directement à l'amour de Jack et Rose. Il manipule, menace et déclenche les poursuites lors du naufrage.",
      },
      {
        key: "fabrizio",
        file: "Fabrizio.jpg",
        name: "Fabrizio",
        description:
          "Allié. Compagnon fidèle de Jack, ami italien plein de vie. Il apporte humour, chaleur et loyauté, et soutient Jack dans les passages décisifs, jusqu'au chaos final.",
      },
      {
        key: "molly",
        file: "Molly brown.jpg",
        name: "Molly Brown",
        description:
          "Mentor. Femme indépendante et bienveillante. Elle voit au-delà des classes, aide Jack à s'intégrer au dîner des premières, encourage Rose à s'affirmer et tente d'organiser l'entraide dans les canots.",
      },
      {
        key: "lovejoy",
        file: "Spicer Lovejoy.jpg",
        name: "Spicer Lovejoy",
        description:
          "Sbire. Homme de main de Caledon, froid et méthodique. Il espionne Jack et Rose, tend des pièges et exécute les basses œuvres de son maître, renforçant l'obstacle imposé par l'antagoniste.",
      },
      {
        key: "jack",
        file: "téléchargé.jpg",
        name: "Jack Dawson",
        description:
          "Héros. Jeune homme sans fortune, animé par la liberté, l'audace et la générosité. Il provoque la rencontre, prend des risques, protège Rose et se sacrifie par amour.",
      },
    ];

    // Rôles narratifs adaptés à Titanic (l'ordre sert d'indice côté serveur)
    this.roles = [
      "Héros", // Jack
      "Mentor", // Molly Brown
      "Antagoniste", // Caledon Hockley
      "Allié", // Fabrizio
      "Héroïne", // Rose
      "Sbire", // Spicer Lovejoy
    ];

    // Map pour stocker les associations personnage -> rôle
    this.assignments = {};
    this.characters.forEach((char) => {
      this.assignments[char.key] = null;
    });

    // Éléments graphiques
    this.characterImages = [];
    this.roleDropZones = [];
    this.roleTexts = [];
    this.assignedLabels = {};
    this.descriptionPanel = null;
    this.successModalShown = false;
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

    // Charger l'état actuel si disponible
    if (server.state.room && server.state.room.Enigma3) {
      const savedRoles = server.state.room.Enigma3.roles;
      if (savedRoles && savedRoles.length === 6) {
        savedRoles.forEach((role, index) => {
          if (role) {
            this.assignments[role] = this.roles[index];
          }
        });
      }
    }
  }

  /**
   * Handles game over event
   *
   * @param {GameServer} _server
   * @param {string} reason
   */
  onGameOver(_server, reason) {
    this.scale.removeAllListeners("resize");
    this.input.removeAllListeners("drop");
    this.input.removeAllListeners("dragstart");
    this.input.removeAllListeners("drag");
    this.input.removeAllListeners("dragend");
    this.input.removeAllListeners("dragenter");
    this.input.removeAllListeners("dragleave");
    this.input.removeAllListeners("pointerdown");
    this.scene.start("GameOver", { server: this.server, reason });
  }

  preload() {
    // Charger le fond
    this.load.image("enigma3-casting-bg", "assets/images/Casting.png");

    // Charger les images des personnages
    this.characters.forEach((char) => {
      this.load.image("enigma3-" + char.key, `assets/images/enigma3/${char.file}`);
    });
  }

  /**
   * Handles scene change event
   *
   * @param {GameServer} _server
   * @param {string} scene
   */
  onSceneChanged(_server, scene) {
    updateBackButton(this.server);
    console.log("Enigma3: Scene changed to:", scene);

    // Si on quitte cette scène, démarrer la nouvelle scène
    if (scene !== "enigma3") {
      // Mapper le nom de la scène vers la clé Phaser
      const sceneMap = {
        main: "Main",
        enigma1: "Enigma1",
        enigma2: "Enigma2",
        enigma3: "Enigma3",
        enigma4: "Enigma4",
        finale: "Finale",
      };

      const sceneKey = sceneMap[scene] || "Main";
      console.log("Enigma3: Starting scene:", sceneKey);
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
        `⏱️ ${minutes}:${secs.toString().padStart(2, "0")}`,
      );
    }
  }

  /**
   * Update the scene with the new game state.
   *
   * @param {GameServer} server - The server instance.
   * @param {Room} room - The room instance.
   * @param {GameEvent} event - The game event.
   */
  onGameUpdate(server, room, event) {
    // Mettre à jour le timer
    this.updateTimer(room.timer);

    if (room.Enigma3.completed) {
      if (this.validateButtonBg) {
        this.validateButtonBg.disableInteractive().setAlpha(0.5);
        this.validateButtonText.setAlpha(0.5);
      }
    }

    // Mettre à jour les assignations depuis le serveur
    if (room.Enigma3 && room.Enigma3.roles) {
      room.Enigma3.roles.forEach((characterKey, roleIndex) => {
        if (characterKey) {
          // Trouver le personnage qui avait ce rôle et le retirer
          Object.keys(this.assignments).forEach((key) => {
            if (
              this.assignments[key] === this.roles[roleIndex] &&
              key !== characterKey
            ) {
              this.assignments[key] = null;
            }
          });

          // Assigner le nouveau rôle
          this.assignments[characterKey] = this.roles[roleIndex];
        }
      });

      // Mettre à jour l'affichage
      this.updateAssignments();
    }

    // Gérer la réponse de soumission
    if (room.Enigma3 && room.Enigma3.completed && !this.successModalShown) {
      this.successModalShown = true;
      this.showSuccessModal();
    } else if (
      event &&
      event.kind === "enigma3:submit-result" &&
      !(room.Enigma3 && room.Enigma3.completed)
    ) {
      this.showModal({
        title: "Pas tout à fait !",
        description: "Ce n'est pas tout à fait ça. Réessayez !",
        emoji: "🤔",
        success: false,
        onClose: () => {},
      });
    }
  }

  create() {
    const { width, height } = this.cameras.main;

    // Ajouter le fond avec effet d'assombrissement
    const bg = this.add.image(width / 2, height / 2, "enigma3-casting-bg");
    bg.setDisplaySize(width, height);
    bg.setAlpha(0.4);

    // Overlay gradient sombre
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.6,
    );
    overlay.setDepth(-1);

    // === Header ===
    const headerY = 40;

    const title = this.add.text(width / 2, headerY, "LE CASTING NARRATIF", {
        fontSize: "48px",
        fontFamily: "Arial Black",
        color: "#ffd700",
        stroke: "#000000",
        strokeThickness: 6,
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, headerY + 50, "Assignez à chaque personnage son rôle", {
        fontSize: "24px",
        fontFamily: "Arial",
        color: "#ffffff",
        fontStyle: "italic",
    }).setOrigin(0.5);

    // Timer en haut à droite
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
    if (this.server.state.room && this.server.state.room.timer !== undefined) {
      this.updateTimer(this.server.state.room.timer);
    }

    // Configuration de la grille des personnages (à gauche, centré verticalement)
    const charSize = 180;
    const charSpacing = 40;
    const charsPerRow = 3;
    const totalCharsWidth =
      charsPerRow * charSize + (charsPerRow - 1) * charSpacing;
    const charBlockHeight = 2 * (charSize + charSpacing + 50);
    const charStartX = width * 0.3;
    const charStartY = (height - charBlockHeight) / 2;

    // Créer les personnages draggables
    this.characters.forEach((char, index) => {
      const row = Math.floor(index / charsPerRow);
      const col = index % charsPerRow;
      const x =
        charStartX - totalCharsWidth / 2 + charSize / 2 + col * (charSize + charSpacing);
      const y = charStartY + (charSize + 50) / 2 + row * (charSize + charSpacing + 50);

      // Ombre portée
      const shadow = this.add.rectangle(
        x + 3,
        y + 3,
        charSize + 8,
        charSize + 8,
        0x000000,
        0.5,
      );
      shadow.setDepth(-1);

      // Bordure moderne avec effet de profondeur
      const border = this.add.rectangle(x, y, charSize + 8, charSize + 8);
      border.setStrokeStyle(4, 0xffd700, 1);
      border.setFillStyle(0x1a1a1a, 0.9);
      border.setDepth(0);

      // Image du personnage (draggable) avec coins arrondis visuels
      const imgBg = this.add.rectangle(x, y, charSize, charSize, 0x000000, 0.3);
      imgBg.setDepth(0.5);

      const img = this.add.image(x, y, "enigma3-" + char.key);
      const containerSize = charSize - 4;
      img.setScale(Math.min(containerSize / img.width, containerSize / img.height));
      img.setInteractive({ dropZone: true });
      img.setDepth(1);

      // Badge "i" pour info
      const infoBadge = this.add.circle(
        x + charSize / 2 - 10,
        y - charSize / 2 + 10,
        12,
        0x4a90e2,
        1
      );
      infoBadge.setStrokeStyle(2, 0xffffff);
      infoBadge.setDepth(2);
      infoBadge.setInteractive({ useHandCursor: true });
      infoBadge.on('pointerdown', () => {
        this.showCharacterDescription(char);
      });

      const infoText = this.add
        .text(x + charSize / 2 - 10, y - charSize / 2 + 10, "i", {
          fontSize: "16px",
          fontStyle: "bold italic",
          color: "#FFF",
        })
        .setOrigin(0.5);
      infoText.setDepth(3);
      infoText.setInteractive({ useHandCursor: true });
      infoText.on('pointerdown', () => {
        this.showCharacterDescription(char);
      });

      // Nom du personnage (sous l'image, style moderne)
      const nameText = this.add
        .text(x, y + charSize / 2 + 22, char.name, {
          fontSize: "15px",
          fontStyle: "bold",
          color: "#FFD700",
          backgroundColor: "#000",
          padding: { left: 8, right: 8, top: 4, bottom: 4 },
        })
        .setOrigin(0.5);
      nameText.setDepth(0);

      // Effet hover sur l'image (juste changement de couleur de bordure)
      img.on("pointerover", () => {
        const characterKey = img.getData("character");
        if (!this.assignments[characterKey]) {
          border.setStrokeStyle(4, 0x00ff00, 1);
        }
      });

      img.on("pointerout", () => {
        const characterKey = img.getData("character");
        if (!this.assignments[characterKey]) {
          border.setStrokeStyle(4, 0xffd700, 1);
        }
      });

      img.setData("character", char.key);
      img.setData("characterData", char);
      img.setData("originalX", x);
      img.setData("originalY", y);
      img.setData("border", border);



      this.characterImages.push(img);
    });

    // Créer les zones de dépôt pour les rôles (à droite, centré verticalement)
    const roleWidth = 240;
    const roleHeight = 60;
    const roleSpacing = 15;
    const totalRoleHeight =
      this.roles.length * roleHeight + (this.roles.length - 1) * roleSpacing;
    const roleStartX = width * 0.75;
    const roleStartY = (height - totalRoleHeight) / 2;

    this.roles.forEach((role, index) => {
      const y = roleStartY + roleHeight / 2 + index * (roleHeight + roleSpacing);

      // Ombre de la zone
      const dropShadow = this.add.rectangle(
        roleStartX + 2,
        y + 2,
        roleWidth,
        roleHeight,
        0x000000,
        0.4
      );
      dropShadow.setDepth(-1);

      // Rectangle visuel moderne pour la zone (main draggable element)
      const dropRect = this.add.rectangle(roleStartX, y, roleWidth, roleHeight);
      dropRect.setStrokeStyle(3, 0x4a90e2, 0.8);
      dropRect.setFillStyle(0x1a1a1a, 0.85);
      dropRect.setDepth(0);
      dropRect.setInteractive({ draggable: true });
      this.input.setDraggable(dropRect);

      // Bordure intérieure subtile
      const innerBorder = this.add.rectangle(
        roleStartX,
        y,
        roleWidth - 8,
        roleHeight - 8
      );
      innerBorder.setStrokeStyle(1, 0xffffff, 0.2);
      innerBorder.setFillStyle(0x000000, 0);
      innerBorder.setDepth(0.5);

      // Icône pour le rôle
      const roleIcon = this.add
        .text(roleStartX - roleWidth / 2 + 20, y, "🎭", {
          fontSize: "20px",
        })
        .setOrigin(0.5);
      roleIcon.setDepth(1);

      // Texte du rôle avec style moderne
      const roleText = this.add
        .text(roleStartX, y - 8, role, {
          fontSize: "17px",
          fontStyle: "bold",
          color: "#FFD700",
          fontFamily: "Arial",
        })
        .setOrigin(0.5);
      roleText.setDepth(1);

      this.roleTexts.push(roleText);

      // Label pour le personnage assigné (initialement vide)
      const assignedLabel = this.add
        .text(roleStartX, y + 18, "", {
          fontSize: "12px",
          fontStyle: "italic",
          color: "#00FF88",
          backgroundColor: "transparent",
        })
        .setOrigin(0.5);
      assignedLabel.setDepth(1);

      this.assignedLabels[role] = assignedLabel;

      // Store all elements and data on the draggable rectangle
      dropRect.setData("role", role);
      dropRect.setData("roleIndex", index);
      dropRect.setData("originalX", roleStartX);
      dropRect.setData("originalY", y);
      dropRect.setData("elements", {
        shadow: dropShadow,
        rect: dropRect,
        innerBorder: innerBorder,
        icon: roleIcon,
        text: roleText,
        label: assignedLabel,
      });
    });

    // Gestion du drag & drop (rôles sur personnages)
    this.input.on('dragstart', (pointer, gameObject) => {
      const elements = gameObject.getData('elements');
      if (elements) {
        Object.values(elements).forEach(el => el.setDepth(100)); // Bring to front
      }
    });

    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      const elements = gameObject.getData('elements');
      if (elements) {
        elements.rect.x = dragX;
        elements.rect.y = dragY;
        elements.shadow.x = dragX + 2;
        elements.shadow.y = dragY + 2;
        elements.innerBorder.x = dragX;
        elements.innerBorder.y = dragY;
        elements.icon.x = dragX - gameObject.width / 2 + 20;
        elements.icon.y = dragY;
        elements.text.x = dragX;
        elements.text.y = dragY - 8;
        elements.label.x = dragX;
        elements.label.y = dragY + 18;
      }
    });

    this.input.on("dragenter", (pointer, gameObject, dropZone) => {
      const border = dropZone.getData("border");
      if (border) {
        border.setStrokeStyle(4, 0x00ff00, 1); // Highlight character border
      }
    });

    this.input.on("dragleave", (pointer, gameObject, dropZone) => {
      const border = dropZone.getData("border");
      if (border) {
        border.setStrokeStyle(4, 0xffd700, 1); // Reset character border
      }
    });

    this.input.on("drop", (pointer, gameObject, dropZone) => {
      const role = gameObject.getData("role");
      const characterKey = dropZone.getData("character");

      if (role && characterKey) {
        // Retirer l'ancienne assignation si elle existe
        Object.keys(this.assignments).forEach((key) => {
          if (this.assignments[key] === role) {
            this.assignments[key] = null;
          }
        });

        // Assigner le nouveau rôle
        this.assignments[characterKey] = role;

        // Mettre à jour l'affichage
        this.updateAssignments();

        // Envoyer au serveur
        const roleIndex = gameObject.getData("roleIndex");
        this.server.socket.emit("enigma3:update", {
          index: roleIndex,
          role: characterKey,
        });
      }

      // Snap back to original position
      const originalX = gameObject.getData("originalX");
      const originalY = gameObject.getData("originalY");
      const elements = gameObject.getData('elements');
      if (elements) {
        this.tweens.add({
            targets: [elements.rect, elements.shadow, elements.innerBorder, elements.icon, elements.text, elements.label],
            x: (target) => {
                if (target === elements.shadow) return originalX + 2;
                if (target === elements.icon) return originalX - gameObject.width / 2 + 20;
                return originalX;
            },
            y: (target) => {
                if (target === elements.shadow) return originalY + 2;
                if (target === elements.text) return originalY - 8;
                if (target === elements.label) return originalY + 18;
                return originalY;
            },
            duration: 200,
            ease: 'Power2'
        });
      }
    });

    this.input.on("dragend", (pointer, gameObject, dropped) => {
      const elements = gameObject.getData('elements');
      if (elements) {
        Object.values(elements).forEach(el => el.setDepth(el.defaultDepth)); // Reset depth
      }

      if (!dropped) {
        // Snap back if not dropped on a valid zone
        const originalX = gameObject.getData("originalX");
        const originalY = gameObject.getData("originalY");
        if (elements) {
            this.tweens.add({
                targets: [elements.rect, elements.shadow, elements.innerBorder, elements.icon, elements.text, elements.label],
                x: (target) => {
                    if (target === elements.shadow) return originalX + 2;
                    if (target === elements.icon) return originalX - gameObject.width / 2 + 20;
                    return originalX;
                },
                y: (target) => {
                    if (target === elements.shadow) return originalY + 2;
                    if (target === elements.text) return originalY - 8;
                    if (target === elements.label) return originalY + 18;
                    return originalY;
                },
                duration: 200,
                ease: 'Power2'
            });
        }
      }
    });

    // Bouton Vérifier
    const buttonY = height - 60;
    const buttonWidth = 200;
    const buttonHeight = 55;

    this.validateButtonBg = this.add.rectangle(
      width / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x4a90e2
    );
    this.validateButtonBg.setStrokeStyle(3, 0x000000);
    this.validateButtonBg.setDepth(999);
    this.validateButtonBg.setInteractive({ useHandCursor: true });

    this.validateButtonText = this.add
      .text(width / 2, buttonY, "✓ VÉRIFIER", {
        fontSize: "22px",
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
      this.tweens.killTweensOf([this.validateButtonBg, this.validateButtonText]);
      this.tweens.add({
        targets: [this.validateButtonBg, this.validateButtonText],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: "Power2",
        onComplete: () => {
          this.submitSolution();
        },
      });
    });

    if (this.server.state.room.Enigma3.completed) {
      this.validateButtonBg.disableInteractive().setAlpha(0.5);
      this.validateButtonText.setAlpha(0.5);
    }
  }

  /**
   * Met à jour l'affichage des assignations
   */
  updateAssignments() {
    // Reset all character borders to default
    this.characterImages.forEach(img => {
        const border = img.getData("border");
        if (border) {
            border.setStrokeStyle(4, 0xffd700, 1); // Default gold
        }
    });

    // Reset all role labels
    Object.values(this.assignedLabels).forEach((label) => {
      label.setText("");
    });

    // Update based on current assignments
    Object.keys(this.assignments).forEach((characterKey) => {
      const role = this.assignments[characterKey];
      if (role) {
        // Update character border to green
        const charImage = this.characterImages.find(img => img.getData("character") === characterKey);
        if (charImage) {
            const border = charImage.getData("border");
            if (border) {
                border.setStrokeStyle(4, 0x00ff88, 1); // Green
            }
        }

        // Update role label
        if (this.assignedLabels[role]) {
            const character = this.characters.find((c) => c.key === characterKey);
            this.assignedLabels[role].setText(`✓ ${character.name}`);
        }
      }
    });
  }

  /**
   * Soumet la solution au serveur
   */
  submitSolution() {
    if (this.server.state.room.Enigma3.completed) return;

    // Vérifier que tous les rôles sont assignés
    const allAssigned = Object.values(this.assignments).every(
      (role) => role !== null,
    );

    if (!allAssigned) {
      this.showModal({
        title: "Attention !",
        description: "Vous devez assigner un personnage à chaque rôle !",
        emoji: "⚠️",
        success: false,
        onClose: () => {},
      });
      return;
    }

    this.server.socket.emit("enigma3:submit");
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
      0.85,
    );
    overlay.setDepth(400);
    overlay.setInteractive();

    // Dimensions du panneau de succès
    const panelWidth = 700;
    const panelHeight = 600;

    // Ombre du panneau
    const panelShadow = this.add.rectangle(
      width / 2 + 6,
      height / 2 + 6,
      panelWidth,
      panelHeight,
      0x000000,
      0.8,
    );
    panelShadow.setDepth(401);

    // Fond du panneau avec gradient simulé
    const panelBg = this.add.rectangle(
      width / 2,
      height / 2,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      0.98,
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
      0,
    );
    innerBorder.setStrokeStyle(3, 0xffd700, 0.6);
    innerBorder.setDepth(403);

    // Icône de succès (étoile ou checkmark)
    const successIcon = this.add
      .text(width / 2, height / 2 - 220, "✓", {
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
      .text(width / 2, height / 2 - 130, "ÉNIGME RÉSOLUE !", {
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
    const educationalText = `Le casting narratif est une étape clé de la création d'un film.

Chaque personnage incarne un archétype (héros, mentor, etc.) qui structure
le récit et guide le spectateur. Le choix des acteurs et la définition
de leurs rôles déterminent la dynamique et l'impact émotionnel de l'histoire.

En comprenant ces archétypes, on décode le langage universel du cinéma.

Félicitations pour avoir terminé cette énigme !`;

    const descText = this.add
      .text(width / 2, height / 2 - 70, educationalText, {
        fontSize: "15px",
        color: "#FFFFFF",
        fontFamily: "Arial",
        align: "center",
        lineSpacing: 6,
        wordWrap: { width: panelWidth - 100 },
      })
      .setOrigin(0.5, 0)
      .setDepth(404);

    // Bouton Valider
    const buttonWidth = 280;
    const buttonHeight = 55;
    const buttonY = height / 2 + 220;

    // Ombre du bouton
    const buttonShadow = this.add.rectangle(
      width / 2 + 4,
      buttonY + 4,
      buttonWidth,
      buttonHeight,
      0x000000,
      0.6,
    );
    buttonShadow.setDepth(403);

    // Fond du bouton
    const validateButton = this.add.rectangle(
      width / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x00ff88,
      1,
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
      0,
    );
    buttonInner.setStrokeStyle(2, 0xffffff, 0.3);
    buttonInner.setDepth(404);

    // Texte du bouton
    const buttonText = this.add
      .text(width / 2, buttonY, "Fermer", {
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
    const panelHeight = Math.min(400, height * 0.8);

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

  /**
   * Affiche la description d'un personnage dans un panneau
   */
  showCharacterDescription(character) {
    // Fermer le panneau existant si présent
    if (this.descriptionPanel) {
      this.descriptionPanel.overlay.destroy();
      this.descriptionPanel.shadow.destroy();
      this.descriptionPanel.background.destroy();
      this.descriptionPanel.titleBar.destroy();
      this.descriptionPanel.icon.destroy();
      this.descriptionPanel.title.destroy();
      this.descriptionPanel.description.destroy();
      this.descriptionPanel.closeButton.destroy();
      this.descriptionPanel.closeBg.destroy();
      this.descriptionPanel = null;
    }

    const { width, height } = this.cameras.main;
    const panelWidth = Math.min(650, width * 0.85);
    const panelHeight = Math.min(350, height * 0.65);
    const panelX = width / 2;
    const panelY = height / 2;

    // Overlay sombre
    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.7,
    );
    overlay.setDepth(1999);
    overlay.setInteractive();

    // Ombre portée du panneau
    const shadow = this.add.rectangle(
      panelX + 6,
      panelY + 6,
      panelWidth,
      panelHeight,
      0x000000,
      0.8,
    );
    shadow.setDepth(2000);

    // Fond du panneau avec style moderne
    const background = this.add.rectangle(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      0x1a1a2e,
      1,
    );
    background.setStrokeStyle(4, 0x4a90e2, 1);
    background.setDepth(2000);
    background.setInteractive();

    // Bordure intérieure
    const innerBorder = this.add.rectangle(
      panelX,
      panelY,
      panelWidth - 10,
      panelHeight - 10,
    );
    innerBorder.setStrokeStyle(2, 0xffd700, 0.5);
    innerBorder.setFillStyle(0x000000, 0);
    innerBorder.setDepth(2000);

    // Barre de titre
    const titleBar = this.add.rectangle(
      panelX,
      panelY - panelHeight / 2 + 40,
      panelWidth,
      80,
      0x2a2a3e,
      0.9,
    );
    titleBar.setDepth(2000);

    // Icône du personnage
    const icon = this.add
      .text(panelX - panelWidth / 2 + 40, panelY - panelHeight / 2 + 40, "🎬", {
        fontSize: "36px",
      })
      .setOrigin(0.5)
      .setDepth(2001);

    // Titre (nom du personnage)
    const title = this.add
      .text(panelX, panelY - panelHeight / 2 + 40, character.name, {
        fontSize: "32px",
        fontStyle: "bold",
        color: "#FFD700",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5)
      .setDepth(2001);

    // Animation du titre
    this.tweens.add({
      targets: title,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Description avec style moderne
    const description = this.add
      .text(panelX, panelY + 20, character.description, {
        fontSize: "17px",
        color: "#E0E0E0",
        backgroundColor: "transparent",
        padding: { left: 40, right: 40, top: 10, bottom: 10 },
        align: "justify",
        lineSpacing: 8,
        wordWrap: { width: panelWidth - 80 },
      })
      .setOrigin(0.5)
      .setDepth(2001);

    // Bouton de fermeture moderne
    const closeBg = this.add.rectangle(
      panelX,
      panelY + panelHeight / 2 - 40,
      180,
      50,
      0xff4444,
      1,
    );
    closeBg.setStrokeStyle(3, 0xffffff, 1);
    closeBg.setDepth(2001);
    closeBg.setInteractive();

    const closeButton = this.add
      .text(panelX, panelY + panelHeight / 2 - 40, "✕ FERMER", {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#FFF",
        fontFamily: "Arial",
      })
      .setOrigin(0.5)
      .setDepth(2002)
      .setInteractive();

    const closePanel = () => {
      // Animation de fermeture
      this.tweens.add({
        targets: [
          overlay,
          shadow,
          background,
          innerBorder,
          titleBar,
          icon,
          title,
          description,
          closeButton,
          closeBg,
        ],
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 200,
        ease: "Back.easeIn",
        onComplete: () => {
          overlay.destroy();
          shadow.destroy();
          background.destroy();
          innerBorder.destroy();
          titleBar.destroy();
          icon.destroy();
          title.destroy();
          description.destroy();
          closeButton.destroy();
          closeBg.destroy();
          this.descriptionPanel = null;
        },
      });
    };

    closeBg.on("pointerover", () => {
      closeBg.setFillStyle(0xff6666, 1);
      // Arrêter les animations en cours
      this.tweens.killTweensOf([closeBg, closeButton]);
      this.tweens.add({
        targets: [closeBg, closeButton],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        ease: "Back.easeOut",
      });
    });

    closeBg.on("pointerout", () => {
      closeBg.setFillStyle(0xff4444, 1);
      // Arrêter les animations en cours
      this.tweens.killTweensOf([closeBg, closeButton]);
      this.tweens.add({
        targets: [closeBg, closeButton],
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: "Back.easeIn",
      });
    });

    closeBg.on("pointerdown", closePanel);
    closeButton.on("pointerdown", closePanel);
    overlay.on("pointerdown", closePanel);

    // Animation d'ouverture
    [
      overlay,
      shadow,
      background,
      innerBorder,
      titleBar,
      icon,
      title,
      description,
      closeButton,
      closeBg,
    ].forEach((obj) => {
      obj.setAlpha(0);
      obj.setScale(0.8);
    });

    this.tweens.add({
      targets: [
        overlay,
        shadow,
        background,
        innerBorder,
        titleBar,
        icon,
        title,
        description,
        closeButton,
        closeBg,
      ],
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: "Back.easeOut",
    });

    this.descriptionPanel = {
      overlay,
      shadow,
      background,
      titleBar,
      icon,
      title,
      description,
      closeButton,
      closeBg,
    };
  }
}
