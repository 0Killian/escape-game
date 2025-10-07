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

/** @type {SocketListeners} */
const listeners = {
  onJoined: (server, player) => {
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
  },
  onPlayerLeft: (server, player) => {
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
  },
  onHostChanged: (server, player) => {
    const list = server.state.room.players
      .map(
        (p) =>
          `<li${p.isHost ? ' class="host"' : ""}>${p.pseudo}${p.isHost ? " (Hôte)" : ""}${!p.connected ? " [déconnecté]" : ""}</li>`,
      )
      .join("");
    document.getElementById("players").innerHTML = `<ul>${list}</ul>`;

    let isHost = server.state.self.isHost;
    document.getElementById("host").textContent = isHost
      ? "Vous êtes l’hôte."
      : "";
  },
  onError: (server, error) => {
    switch (error) {
      case "room:full":
        showError("Salle pleine");
        break;
      case "room:not-found":
        showError("Salle inexistante");
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

    console.log(server.state.room);
  },
};

(async () => {
  await joinRoom(pseudo, roomCode, listeners);
})();
