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
          "Jeune femme de la haute société, prisonnière de son destin. Elle change de position et d'identité au fil de l'histoire : de victime enfermée à femme libre. Son ambivalence initiale crée le doute (alliée ou obstacle ?) avant sa métamorphose complète.",
      },
      {
        key: "caledon",
        file: "Caledon Hockley.jpg",
        name: "Caledon Hockley",
        description:
          "Fiancé de Rose, homme d'affaires fortuné et représentant des conventions sociales. Il défend l'ordre établi et la rigidité de classe, empêchant la transgression initiale. Il teste la détermination de ceux qui veulent franchir les barrières sociales.",
      },
      {
        key: "fabrizio",
        file: "Fabrizio.jpg",
        name: "Fabrizio",
        description:
          "Compagnon fidèle de Jack, ami italien plein de vie. Il soutient le protagoniste dans les moments clés et partage son humanité, son humour et sa loyauté. Sa présence offre un soutien moral constant dans l'aventure.",
      },
      {
        key: "molly",
        file: "Molly brown.jpg",
        name: "Molly Brown",
        description:
          "Femme indépendante et bienveillante, elle soutient Jack et Rose contre les barrières sociales. Elle transmet courage et lucidité, guide pragmatique qui aide les protagonistes à voir plus clair dans leur situation.",
      },
      {
        key: "lovejoy",
        file: "Spicer Lovejoy.jpg",
        name: "Spicer Lovejoy",
        description:
          "Valet de Caledon, personnage manipulateur et cynique. Il introduit la ruse et la surveillance, brouillant les pistes et créant des obstacles par des moyens détournés. Moteur de tension dramatique par ses actions sournoises et imprévisibles.",
      },
      {
        key: "jack",
        file: "téléchargé.jpg",
        name: "Jack Dawson",
        description:
          "Jeune homme sans fortune, animé par la liberté et la passion. Personnage principal qui traverse l'épreuve du voyage, de l'amour impossible et du sacrifice. Il incarne le mouvement, le risque, et la transformation de soi face à l'adversité.",
      },
    ];

    this.roles = [
      "Héros",
      "Mentor",
      "Gardien du seuil",
      "Allié",
      "Shapeshifter",
      "Trickster",
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

    // Charger l'état actuel si disponible
    if (server.state.room && server.state.room.enigma3) {
      const savedRoles = server.state.room.enigma3.roles;
      if (savedRoles && savedRoles.length === 6) {
        savedRoles.forEach((role, index) => {
          if (role) {
            this.assignments[role] = this.roles[index];
          }
        });
      }
    }
  }

  preload() {
    // Charger le fond
    this.load.image("casting-bg", "assets/images/Casting.png");

    // Charger les images des personnages
    this.characters.forEach((char) => {
      this.load.image(char.key, `assets/images/enigma3/${char.file}`);
    });
  }

  /**
   * Handles scene change event
   *
   * @param {GameServer} _server
   * @param {string} scene
   */
  onSceneChanged(_server, scene) {
    console.log("Enigma3: Scene changed to:", scene);
    
    // Si on quitte cette scène, démarrer la nouvelle scène
    if (scene !== "enigma3") {
      // Mapper le nom de la scène vers la clé Phaser
      const sceneMap = {
        "main": "Main",
        "enigma1": "Enigma1",
        "enigma2": "Enigma2",
        "enigma3": "Enigma3",
        "enigma4": "Enigma4",
        "finale": "Finale"
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
      this.timerText.setText(`⏱️ ${minutes}:${secs.toString().padStart(2, "0")}`);
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

    // Mettre à jour les assignations depuis le serveur
    if (room.enigma3 && room.enigma3.roles) {
      room.enigma3.roles.forEach((characterKey, roleIndex) => {
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
    if (room.enigma3 && room.enigma3.completed) {
      this.showMessage(
        "🎉 Bravo ! Vous avez correctement identifié tous les archétypes narratifs !\n\nLa plupart des histoires suivent des structures universelles.",
        "#00FF00"
      );

      // Passer à la scène suivante après 5 secondes
      this.time.delayedCall(5000, () => {
        server.changeScene("main");
      });
    } else if (
      event &&
      event.kind === "enigma3:submit-result" &&
      !room.enigma3.completed
    ) {
      this.showMessage(
        "❌ Ce n'est pas tout à fait ça. Réessayez !",
        "#FF0000"
      );
    }
  }

  create() {
    const { width, height } = this.cameras.main;

    // Ajouter le fond avec effet d'assombrissement
    const bg = this.add.image(width / 2, height / 2, "casting-bg");
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

    // Titre avec effet néon (réduit et repositionné)
    const titleBg = this.add.rectangle(width / 2, 35, 600, 60, 0x000000, 0.8);
    titleBg.setStrokeStyle(3, 0xffd700, 0.8);
    titleBg.setDepth(100);

    const title = this.add
      .text(width / 2, 30, "LE CASTING NARRATIF", {
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
        "✨ Cliquez sur un personnage pour découvrir son archétype ✨",
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

    // Configuration de la grille des personnages (à gauche)
    const charSize = 120;
    const charSpacing = 20;
    const charsPerRow = 3;
    const totalCharsWidth =
      charsPerRow * charSize + (charsPerRow - 1) * charSpacing;
    const charStartX = width * 0.25;
    const charStartY = 180;

    // Créer les personnages draggables
    this.characters.forEach((char, index) => {
      const row = Math.floor(index / charsPerRow);
      const col = index % charsPerRow;
      const x =
        charStartX -
        totalCharsWidth / 2 +
        charSize / 2 +
        col * (charSize + charSpacing);
      const y = charStartY + row * (charSize + charSpacing + 50);

      // Ombre portée
      const shadow = this.add.rectangle(
        x + 3,
        y + 3,
        charSize + 8,
        charSize + 8,
        0x000000,
        0.5
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

      const img = this.add.image(x, y, char.key);
      img.setDisplaySize(charSize - 4, charSize - 4);
      img.setInteractive();
      img.setDepth(1);
      this.input.setDraggable(img);

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

      const infoText = this.add
        .text(x + charSize / 2 - 10, y - charSize / 2 + 10, "i", {
          fontSize: "16px",
          fontStyle: "bold italic",
          color: "#FFF",
        })
        .setOrigin(0.5);
      infoText.setDepth(3);

      // Nom du personnage (sous l'image, style moderne)
      const nameText = this.add
        .text(x, y + charSize / 2 + 22, char.name, {
          fontSize: "13px",
          fontStyle: "bold",
          color: "#FFD700",
          backgroundColor: "#000",
          padding: { left: 8, right: 8, top: 4, bottom: 4 },
        })
        .setOrigin(0.5);
      nameText.setDepth(0);

      // Effet hover sur l'image (juste changement de couleur de bordure)
      img.on("pointerover", () => {
        border.setStrokeStyle(4, 0x00ff00, 1);
      });

      img.on("pointerout", () => {
        border.setStrokeStyle(4, 0xffd700, 1);
      });

      img.setData("character", char.key);
      img.setData("characterData", char);
      img.setData("originalX", x);
      img.setData("originalY", y);
      img.setData("border", border);

      // Ajouter l'événement de clic pour afficher la description
      img.on("pointerdown", (pointer) => {
        // Vérifier si c'est un clic simple (pas un drag)
        const startX = pointer.downX;
        const startY = pointer.downY;

        img.once("pointerup", (upPointer) => {
          const distance = Phaser.Math.Distance.Between(
            startX,
            startY,
            upPointer.upX,
            upPointer.upY
          );
          if (distance < 10) {
            // C'est un clic, pas un drag
            this.showCharacterDescription(char);
          }
        });
      });

      this.characterImages.push(img);
    });

    // Créer les zones de dépôt pour les rôles (centrées à droite)
    const roleWidth = 240;
    const roleHeight = 60;
    const roleSpacing = 15;
    const totalRoleHeight =
      this.roles.length * roleHeight + (this.roles.length - 1) * roleSpacing;
    const roleStartX = width * 0.75;
    const roleStartY = (height - totalRoleHeight) / 2 + roleHeight / 2 + 50;

    this.roles.forEach((role, index) => {
      const y = roleStartY + index * (roleHeight + roleSpacing);

      // Zone de dépôt
      const dropZone = this.add.zone(roleStartX, y, roleWidth, roleHeight);
      dropZone.setRectangleDropZone(roleWidth, roleHeight);
      dropZone.setData("role", role);
      dropZone.setData("roleIndex", index);

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

      // Rectangle visuel moderne pour la zone
      const dropRect = this.add.rectangle(roleStartX, y, roleWidth, roleHeight);
      dropRect.setStrokeStyle(3, 0x4a90e2, 0.8);
      dropRect.setFillStyle(0x1a1a1a, 0.85);
      dropRect.setDepth(0);

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

      dropZone.setData("rect", dropRect);
      dropZone.setData("innerBorder", innerBorder);
      this.roleDropZones.push(dropZone);

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
    });

    // Gestion du drag & drop
    this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on("dragenter", (pointer, gameObject, dropZone) => {
      const rect = dropZone.getData("rect");
      const innerBorder = dropZone.getData("innerBorder");
      if (rect) {
        // Arrêter toutes les animations en cours
        this.tweens.killTweensOf(rect);
        rect.setStrokeStyle(4, 0xffff00, 1);
        rect.setFillStyle(0xffff00, 0.2);
        this.tweens.add({
          targets: rect,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 150,
          ease: "Back.easeOut",
        });
      }
      if (innerBorder) innerBorder.setStrokeStyle(2, 0xffff00, 0.6);
    });

    this.input.on("dragleave", (pointer, gameObject, dropZone) => {
      const rect = dropZone.getData("rect");
      const innerBorder = dropZone.getData("innerBorder");
      if (rect) {
        // Arrêter toutes les animations en cours
        this.tweens.killTweensOf(rect);

        // Vérifier si cette zone a déjà un personnage assigné
        const role = dropZone.getData("role");
        const isAssigned = Object.values(this.assignments).includes(role);

        if (isAssigned) {
          rect.setStrokeStyle(3, 0x00ff88, 1);
        } else {
          rect.setStrokeStyle(3, 0x4a90e2, 0.8);
        }
        rect.setFillStyle(0x1a1a1a, 0.85);
        this.tweens.add({
          targets: rect,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: "Back.easeIn",
        });
      }
      if (innerBorder) innerBorder.setStrokeStyle(1, 0xffffff, 0.2);
    });

    this.input.on("drop", (pointer, gameObject, dropZone) => {
      const characterKey = gameObject.getData("character");
      const role = dropZone.getData("role");

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
      const roleIndex = dropZone.getData("roleIndex");
      this.server.socket.emit("enigma3:update", {
        index: roleIndex,
        role: characterKey,
      });

      // Remettre l'image à sa position d'origine avec animation
      const originalX = gameObject.getData("originalX");
      const originalY = gameObject.getData("originalY");

      this.tweens.add({
        targets: gameObject,
        x: originalX,
        y: originalY,
        duration: 200,
        ease: "Power2",
      });

      // Réinitialiser la couleur de la bordure avec animation
      const rect = dropZone.getData("rect");
      const innerBorder = dropZone.getData("innerBorder");
      if (rect) {
        // Arrêter toutes les animations en cours
        this.tweens.killTweensOf(rect);
        // Animation de succès rapide
        this.tweens.add({
          targets: rect,
          alpha: { from: 1, to: 0.7 },
          duration: 200,
          yoyo: true,
          ease: "Sine.easeInOut",
          onComplete: () => {
            rect.setStrokeStyle(3, 0x00ff88, 1);
            rect.setFillStyle(0x1a1a1a, 0.85);
            rect.setScale(1);
            rect.setAlpha(1);
          },
        });
      }
      if (innerBorder) {
        innerBorder.setStrokeStyle(1, 0x00ff88, 0.4);
        innerBorder.setScale(1);
      }
    });

    this.input.on("dragend", (pointer, gameObject, dropped) => {
      if (!dropped) {
        // Si pas droppé dans une zone, retourner à la position d'origine
        const originalX = gameObject.getData("originalX");
        const originalY = gameObject.getData("originalY");

        this.tweens.add({
          targets: gameObject,
          x: originalX,
          y: originalY,
          duration: 200,
          ease: "Power2",
        });
      }
    });

    // Bouton Vérifier moderne
    const buttonY = height - 60;

    // Ombre du bouton
    const buttonShadow = this.add.rectangle(
      width / 2 + 4,
      buttonY + 4,
      200,
      55,
      0x000000,
      0.5
    );
    buttonShadow.setDepth(998);

    // Background du bouton avec gradient simulé
    const buttonBg1 = this.add.rectangle(
      width / 2,
      buttonY,
      200,
      55,
      0x4a90e2,
      1
    );
    buttonBg1.setStrokeStyle(3, 0xffd700, 1);
    buttonBg1.setDepth(999);

    const buttonBg2 = this.add.rectangle(
      width / 2,
      buttonY - 12,
      200,
      28,
      0x5aa0f2,
      0.5
    );
    buttonBg2.setDepth(999);

    const submitButton = this.add
      .text(width / 2, buttonY, "✓ VÉRIFIER", {
        fontSize: "22px",
        fontStyle: "bold",
        color: "#FFF",
        fontFamily: "Arial Black",
      })
      .setOrigin(0.5, 0.5)
      .setInteractive()
      .setDepth(1000);

    // Animation permanente du bouton
    this.tweens.add({
      targets: [buttonBg1, buttonBg2, submitButton],
      scaleY: { from: 1, to: 1.05 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    submitButton.on("pointerover", () => {
      buttonBg1.setFillStyle(0x00ff88, 1);
      buttonBg1.setStrokeStyle(4, 0xffffff, 1);
      // Arrêter les animations en cours
      this.tweens.killTweensOf([
        buttonBg1,
        buttonBg2,
        submitButton,
        buttonShadow,
      ]);
      this.tweens.add({
        targets: [buttonBg1, buttonBg2, submitButton, buttonShadow],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 200,
        ease: "Back.easeOut",
      });
    });

    submitButton.on("pointerout", () => {
      buttonBg1.setFillStyle(0x4a90e2, 1);
      buttonBg1.setStrokeStyle(3, 0xffd700, 1);
      // Arrêter les animations en cours
      this.tweens.killTweensOf([
        buttonBg1,
        buttonBg2,
        submitButton,
        buttonShadow,
      ]);
      this.tweens.add({
        targets: [buttonBg1, buttonBg2, submitButton, buttonShadow],
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: "Back.easeIn",
      });
    });

    submitButton.on("pointerdown", () => {
      // Arrêter les animations en cours
      this.tweens.killTweensOf([buttonBg1, buttonBg2, submitButton]);
      this.tweens.add({
        targets: [buttonBg1, buttonBg2, submitButton],
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: "Power2",
      });
      this.submitSolution();
    });
  }

  /**
   * Met à jour l'affichage des assignations
   */
  updateAssignments() {
    // Réinitialiser tous les labels
    Object.values(this.assignedLabels).forEach((label) => {
      label.setText("");
    });

    // Mettre à jour avec les nouvelles assignations
    Object.keys(this.assignments).forEach((characterKey) => {
      const role = this.assignments[characterKey];
      if (role && this.assignedLabels[role]) {
        const character = this.characters.find((c) => c.key === characterKey);
        this.assignedLabels[role].setText(`✓ ${character.name}`);
      }
    });

    // Mettre à jour les couleurs des zones de dépôt
    this.roleDropZones.forEach((dropZone) => {
      const rect = dropZone.getData("rect");
      const role = dropZone.getData("role");
      const isAssigned = Object.values(this.assignments).includes(role);

      if (rect) {
        // Arrêter les animations en cours
        this.tweens.killTweensOf(rect);
        if (isAssigned) {
          rect.setStrokeStyle(3, 0x00ff88, 1);
        } else {
          rect.setStrokeStyle(3, 0x4a90e2, 0.8);
        }
        rect.setFillStyle(0x1a1a1a, 0.85);
        rect.setScale(1);
      }
    });
  }

  /**
   * Soumet la solution au serveur
   */
  submitSolution() {
    // Vérifier que tous les rôles sont assignés
    const allAssigned = Object.values(this.assignments).every(
      (role) => role !== null
    );

    if (!allAssigned) {
      this.showMessage(
        "⚠️ Vous devez assigner un personnage à chaque rôle !",
        "#FF0000"
      );
      return;
    }

    this.server.socket.emit("enigma3:submit");
  }

  /**
   * Affiche un message temporaire
   */
  showMessage(text, color = "#FFF") {
    const { width, height } = this.cameras.main;
    const message = this.add
      .text(width / 2, height / 2, text, {
        fontSize: "24px",
        fontStyle: "bold",
        color: color,
        backgroundColor: "#000",
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
        stroke: color === "#FF0000" ? "#000" : "#000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: width * 0.8 },
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.tweens.add({
      targets: message,
      alpha: 0,
      duration: 3000,
      ease: "Power2",
      onComplete: () => {
        message.destroy();
      },
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
      0.7
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
      0.8
    );
    shadow.setDepth(2000);

    // Fond du panneau avec style moderne
    const background = this.add.rectangle(
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      0x1a1a2e,
      1
    );
    background.setStrokeStyle(4, 0x4a90e2, 1);
    background.setDepth(2000);
    background.setInteractive();

    // Bordure intérieure
    const innerBorder = this.add.rectangle(
      panelX,
      panelY,
      panelWidth - 10,
      panelHeight - 10
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
      0.9
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
      1
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
