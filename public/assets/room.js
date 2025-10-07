document.addEventListener("DOMContentLoaded", () => {
  const containerWidth = 600;
  const perforationWidth = 12;
  const perforationSpacing = 8;
  const sidePadding = 8;
  const availableWidth = containerWidth - 2 * sidePadding;
  const perforationsCount = Math.floor(
    availableWidth / (perforationWidth + perforationSpacing),
  );
  const topPerforations = document.getElementById("top-perforations");
  const bottomPerforations = document.getElementById("bottom-perforations");

  /**
   * Creates perforations in the specified container.
   *
   * @param {HTMLElement} container
   * @param {number} count
   */
  function createPerforations(container, count) {
    if (!container) return;
    for (let i = 0; i < count; i++) {
      const perforation = document.createElement("div");
      perforation.className =
        "perforation bg-white rounded-sm mt-1.5 w-[12px] h-2";
      container.appendChild(perforation);
    }
  }

  createPerforations(topPerforations, perforationsCount);
  createPerforations(bottomPerforations, perforationsCount);
});

let chatOpen = false;
let chatMessagesList = [];

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

if (!roomCode || !pseudo) {
  window.location.href = "/";
}

/**
 * Binds the chat UI to the game server
 *
 * @param {GameServer} server
 */
function bindChatUI(server) {
  const chatBtn = document.getElementById("chatBtn");
  const closeChat = document.getElementById("closeChat");
  const chatForm = document.getElementById("chatForm");
  const chatModal = document.getElementById("chatModal");
  const chatInput = document.getElementById("chatInput");

  if (chatBtn)
    chatBtn.onclick = async () => {
      if (chatModal) chatModal.style.display = "flex";
      chatOpen = true;
      showChatNotif(false);
      if (server && server.state && server.state.room) {
        chatMessagesList = await fetchRoomMessages(server.state.room.code);
        renderMessages(chatMessagesList);
      }
    };
  if (closeChat)
    closeChat.onclick = () => {
      if (chatModal) chatModal.style.display = "none";
      chatOpen = false;
    };
  if (chatForm)
    chatForm.onsubmit = (e) => {
      e.preventDefault();
      if (!chatInput) return;
      const inputEl = /** @type {HTMLInputElement} */ (chatInput);
      const text = inputEl.value.trim();
      if (!text) return;
      sendMessage(server, text);
      inputEl.value = "";
    };
}

/**
 * Renders the list of players in the UI.
 *
 * @param {Player[]} players
 */
function renderPlayers(players) {
  const list = players
    .map(
      (p) =>
        `<li${p.isHost ? ' class="host"' : ""}>${p.pseudo}${p.isHost ? " (Hôte)" : ""}${!p.connected ? " [déconnecté]" : ""}</li>`,
    )
    .join("");

  const ul = document.getElementById("players-list");
  if (ul) ul.innerHTML = list;
}

/**
 * Updates the status message in the UI.
 *
 * @param {GameServer} server
 */
function updateStatus(server) {
  const status = document.getElementById("status");
  if (!status) return;
  if (server.state.room.players.length < 2) {
    status.textContent = "En attente de joueur...";
    document.getElementById("startBtn").setAttribute("disabled", "true");
  } else {
    status.textContent = "Salle complète.";
    document.getElementById("startBtn").removeAttribute("disabled");
  }
}

/** @type {SocketListeners} */
const listeners = {
  onJoined: (server) => {
    renderPlayers(server.state.room.players);
    updateStatus(server);
  },
  onPlayerLeft: (server) => {
    renderPlayers(server.state.room.players);
    updateStatus(server);
  },
  onHostChanged: (server) => {
    renderPlayers(server.state.room.players);
  },
  onReconnected: (server) => {
    renderPlayers(server.state.room.players);
    updateStatus(server);
  },
  onDisconnected: (server) => {
    renderPlayers(server.state.room.players);
    updateStatus(server);
  },
  onNewMessage: (_server, msg) => {
    chatMessagesList.push(msg);
    if (chatOpen) {
      renderMessages(chatMessagesList);
    } else {
      showChatNotif(true);
    }
  },
  onError: (_server, error) => {
    switch (error) {
      case "error:full":
        showError("Salle pleine");
        break;
      case "error:not-found":
        showError("Salle inexistante");
        break;
      case "error:not-authorized":
        showError("Vous n’êtes pas autorisé à rejoindre cette salle");
        break;
      case "error:invalid-scene-change":
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
  onConnected: (server) => {
    bindChatUI(server);
    renderPlayers(server.state.room.players);
    updateStatus(server);

    document.getElementById("code-display").textContent = roomCode;

    document.getElementById("leaveBtn").onclick = () => {
      server.leave();
      localStorage.removeItem("playerId");
      window.location.assign("/");
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

/**
 * Renders messages in the chat
 *
 * @param {Message[]} messages
 * @returns
 */
function renderMessages(messages) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;
  chatMessages.innerHTML = messages
    .map(
      (m) => `
    <div class="mb-3 text-white">
      <span style="font-weight:bold;color:#7cf;">${m.author.pseudo}</span>
      <span style="color:#aaa;font-size:0.9em;margin-left:6px;">${new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><br/>
      <span style="word-break:break-word;">${m.text.replace(/</g, "&lt;")}</span>
    </div>`,
    )
    .join("");
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatMessages.scrollTo({ top: chatMessages.scrollHeight });
}

/**
 * Sets the visibility of the chat notification
 *
 * @param {boolean} show
 */
function showChatNotif(show) {
  const notif = document.getElementById("chatNotif");
  if (notif) notif.style.display = show ? "block" : "none";
}

(async () => {
  await joinRoom(pseudo, roomCode, listeners);
})();
