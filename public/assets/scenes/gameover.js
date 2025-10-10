class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  /**
   * Initialize the scene with the server instance.
   * @param {Object} data - Additional data
   * @param {GameServer} data.server - The server instance.
   * @param {string} data.reason - Reason for game over ("timeout" or other)
   */
  init(data) {
    this.server = data.server;
    this.reason = data.reason || "timeout";
  }

  create() {
    const screenWidth = this.cameras.main.width;
    const screenHeight = this.cameras.main.height;

    // Dark background
    this.add
      .rectangle(0, 0, screenWidth, screenHeight, 0x1a1a1a)
      .setOrigin(0, 0);

    // Red overlay for dramatic effect
    const overlay = this.add.rectangle(
      0,
      0,
      screenWidth,
      screenHeight,
      0xff0000,
      0.15,
    );
    overlay.setOrigin(0, 0);

    // Title
    const titleText = this.add.text(
      screenWidth / 2,
      screenHeight * 0.25,
      "TEMPS ÉCOULÉ !",
      {
        fontSize: "72px",
        fontStyle: "bold",
        color: "#ff4444",
        stroke: "#000000",
        strokeThickness: 8,
        align: "center",
      },
    );
    titleText.setOrigin(0.5, 0.5);

    // Hourglass emoji
    const emojiText = this.add.text(screenWidth / 2, screenHeight * 0.4, "⏱️", {
      fontSize: "120px",
      align: "center",
    });
    emojiText.setOrigin(0.5, 0.5);

    // Message
    const messageText = this.add.text(
      screenWidth / 2,
      screenHeight * 0.55,
      "Le temps imparti pour résoudre les énigmes est terminé.\nVotre aventure cinématographique s'arrête ici...",
      {
        fontSize: "24px",
        color: "#cccccc",
        align: "center",
        wordWrap: { width: screenWidth * 0.8 },
      },
    );
    messageText.setOrigin(0.5, 0.5);

    // Show completed enigmas count
    if (this.server && this.server.state && this.server.state.room) {
      const room = this.server.state.room;
      let completedCount = 0;
      if (room.Enigma1 && room.Enigma1.completed) completedCount++;
      if (room.Enigma2 && room.Enigma2.completed) completedCount++;
      if (room.Enigma3 && room.Enigma3.completed) completedCount++;
      if (room.Enigma4 && room.Enigma4.completed) completedCount++;

      const statsText = this.add.text(
        screenWidth / 2,
        screenHeight * 0.68,
        `Énigmes résolues : ${completedCount}/3`,
        {
          fontSize: "28px",
          fontStyle: "bold",
          color: "#ffaa00",
          align: "center",
        },
      );
      statsText.setOrigin(0.5, 0.5);
    }

    // Return to lobby button
    const buttonY = screenHeight * 0.82;
    const buttonWidth = 300;
    const buttonHeight = 60;

    const returnButton = this.add.rectangle(
      screenWidth / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0x444444,
    );
    returnButton.setStrokeStyle(3, 0xff4444);
    returnButton.setInteractive({ useHandCursor: true });

    const returnButtonText = this.add.text(
      screenWidth / 2,
      buttonY,
      "RETOUR AU LOBBY",
      {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#ffffff",
      },
    );
    returnButtonText.setOrigin(0.5, 0.5);

    // Button hover effects
    returnButton.on("pointerover", () => {
      returnButton.setFillStyle(0x666666);
      returnButton.setScale(1.05);
      returnButtonText.setScale(1.05);
    });

    returnButton.on("pointerout", () => {
      returnButton.setFillStyle(0x444444);
      returnButton.setScale(1);
      returnButtonText.setScale(1);
    });

    returnButton.on("pointerdown", () => {
      // Reload the page to return to lobby
      window.location.href = "/";
    });

    // Add pulsing animation to emoji
    this.tweens.add({
      targets: emojiText,
      scale: { from: 1, to: 1.1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Handle resize
    this.scale.on("resize", () => {
      this.scene.restart();
    });
  }
}
