/**
 * Displays the error message to the user.
 *
 * @param {string} msg
 */
function showError(msg) {
  document.getElementById("errorMsg").textContent = msg;
}

const roomCode = localStorage.getItem("roomCode");
const pseudo = localStorage.getItem("pseudo");

/**
 * Updates the player list in the UI.
 *
 * @param {GameServer} server
 */
function updatePlayerList(server) {
  const list = server.state.room.players
    .map(
      (p) =>
        `<li${p.isHost ? ' class="host"' : ""}>${p.pseudo}${p.isHost ? " (Hôte)" : ""}${!p.connected ? " [déconnecté]" : ""}</li>`,
    )
    .join("");
  document.getElementById("players").innerHTML = `<ul>${list}</ul>`;

  if (server.state.room.players.length < 2) {
    document.getElementById("status").textContent = "En attente de joueur...";
    document.getElementById("startBtn").setAttribute("disabled", "true");
  } else {
    document.getElementById("status").textContent = "Prêt à commencer...";
    document.getElementById("startBtn").removeAttribute("disabled");
  }
}

/** @type {SocketListeners} */
const listeners = {
  onReconnected: updatePlayerList,
  onDisconnected: updatePlayerList,
  onJoined: updatePlayerList,
  onPlayerLeft: updatePlayerList,
  onHostChanged: updatePlayerList,
  onError: (server, error) => {
    switch (error) {
      case "room:full":
        showError("Salle pleine");
        break;
      case "room:not-found":
        showError("Salle inexistante");
        break;
      case "room:not-authorized":
        showError("Vous n’êtes pas autorisé à rejoindre cette salle");
        break;
      case "room:invalid-scene-change":
        showError(
          "Vous ne pouvez pas aller dans cette salle depuis votre position actuelle",
        );
        break;
      default:
        showError("Erreur inconnue");
        console.error(error);
        break;
    }
  },
  /**
   * Called when the client is connected to the server.
   *
   * @param {GameServer} server - The server instance.
   */
  onConnected: (server) => {
    const list = server.state.room.players
      .map(
        (p) =>
          `<li${p.isHost ? ' class="host"' : ""}>${p.pseudo}${p.isHost ? " (Hôte)" : ""}${!p.connected ? " [déconnecté]" : ""}</li>`,
      )
      .join("");
    document.getElementById("players").innerHTML = `<ul>${list}</ul>`;

    document.getElementById("status").textContent =
      server.state.room.players.length < 2
        ? "En attente de joueur..."
        : "Salle complète.";

    document.getElementById("roomCode").textContent =
      `Code salle : ${roomCode}`;

    document.getElementById("leaveBtn").onclick = () => {
      server.leave();
      localStorage.removeItem("playerId");
      window.location.assign("/form.html");
    };

    document.getElementById("startBtn").onclick = () => {
      if (server.state.room.players.length == 2) {
        document.getElementById("waiting-room").style.display = "none";
        startGame(server);
      } else {
        showError("Vous devez être sdeux joueurs pour commencer la partie.");
      }
    };

    console.log(server.state.room);
  },
};

(async () => {
  await joinRoom(pseudo, roomCode, listeners);
})();
