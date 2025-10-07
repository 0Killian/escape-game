// UI + chat + room join logic centralisée pour room.html

(function() {
  const roomCode = localStorage.getItem("roomCode");
  const pseudo = localStorage.getItem("pseudo");
  if (!roomCode || !pseudo) {
    window.location.href = "/";
    return;
  }

  // Perforations (pellicule)
  document.addEventListener('DOMContentLoaded', () => {
    const containerWidth = 600;
    const perforationWidth = 12;
    const perforationSpacing = 8;
    const sidePadding = 8;
    const availableWidth = containerWidth - (2 * sidePadding);
    const perforationsCount = Math.floor(availableWidth / (perforationWidth + perforationSpacing));
    const topPerforations = document.getElementById('top-perforations');
    const bottomPerforations = document.getElementById('bottom-perforations');
    function createPerforations(container, count) {
      if (!container) return;
      for (let i = 0; i < count; i++) {
        const perforation = document.createElement('div');
        perforation.className = 'perforation bg-white rounded-sm mt-1.5 w-[12px] h-2';
        container.appendChild(perforation);
      }
    }
    createPerforations(topPerforations, perforationsCount);
    createPerforations(bottomPerforations, perforationsCount);
  });

  function showError(msg) {
    const el = document.getElementById('errorMsg');
    if (el) el.textContent = msg;
  }

  function renderPlayers(players) {
    const list = players.map(
      (p) => `<li${p.isHost ? ' class="host"' : ''}>${p.pseudo}${p.isHost ? ' (Hôte)' : ''}${!p.connected ? ' [déconnecté]' : ''}</li>`
    ).join("");
    const ul = document.getElementById('players-list');
    if (ul) ul.innerHTML = list;
  }

  function updateStatus(server) {
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = server.state.room.players.length < 2 ? 'En attente de joueur...' : 'Salle complète.';
  }

  const listeners = {
    onJoined: (server) => { renderPlayers(server.state.room.players); updateStatus(server); },
    onPlayerLeft: (server) => { renderPlayers(server.state.room.players); updateStatus(server); },
    onHostChanged: (server) => { renderPlayers(server.state.room.players); },
    onError: (server, error) => {
      switch (error) {
        case 'room:full': showError('Salle pleine'); break;
        case 'room:not-found': showError('Salle inexistante'); break;
        default: showError('Erreur inconnue'); console.error(error); break;
      }
    },
    onConnected: (server) => {
      renderPlayers(server.state.room.players);
      updateStatus(server);
      const codeDisplay = document.getElementById('code-display');
      if (codeDisplay) codeDisplay.textContent = roomCode;
      const leaveBtn = document.getElementById('leaveBtn');
      if (leaveBtn) {
        leaveBtn.onclick = () => {
          server.leave();
          localStorage.removeItem('playerId');
          window.location.href = '/';
        };
      }
    }
  };

  // --- Chat ---
  let chatOpen = false;
  let chatMessagesList = [];
  let gameServer = null;

  function renderMessages(messages) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    chatMessages.innerHTML = messages.map(m => `
      <div class="mb-3 text-white">
        <span style="font-weight:bold;color:#7cf;">${m.author.pseudo}</span>
        <span style="color:#aaa;font-size:0.9em;margin-left:6px;">${new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><br/>
        <span style="word-break:break-word;">${m.text.replace(/</g,'&lt;')}</span>
      </div>`).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showChatNotif(show) {
    const notif = document.getElementById('chatNotif');
    if (notif) notif.style.display = show ? 'block' : 'none';
  }

  function bindChatUI() {
    const chatBtn = document.getElementById('chatBtn');
    const closeChat = document.getElementById('closeChat');
    const chatForm = document.getElementById('chatForm');
    const chatModal = document.getElementById('chatModal');
    const chatInput = document.getElementById('chatInput');

    if (chatBtn) chatBtn.onclick = async () => {
      if (chatModal) chatModal.style.display = 'flex';
      chatOpen = true;
      showChatNotif(false);
      if (gameServer && gameServer.state && gameServer.state.room) {
        chatMessagesList = await fetchRoomMessages(gameServer.state.room.code);
        renderMessages(chatMessagesList);
      }
    };
    if (closeChat) closeChat.onclick = () => {
      if (chatModal) chatModal.style.display = 'none';
      chatOpen = false;
    };
    if (chatForm) chatForm.onsubmit = (e) => {
      e.preventDefault();
      if (!chatInput) return;
      const inputEl = /** @type {HTMLInputElement} */ (chatInput);
      const text = inputEl.value.trim();
      if (!text) return;
      sendMessage(gameServer, text);
      inputEl.value = '';
    };
  }

  const listenersWithChat = Object.assign({}, listeners, {
    onConnected: (server) => {
      listeners.onConnected && listeners.onConnected(server);
      gameServer = server;
    }
  });

  (async () => {
    bindChatUI();
    gameServer = await joinRoom(pseudo, roomCode, listenersWithChat);
    /** @type {any} */(gameServer).onNewMessage = (msg) => {
      chatMessagesList.push(msg);
      if (chatOpen) {
        renderMessages(chatMessagesList);
      } else {
        showChatNotif(true);
      }
    };
  })();
})();
