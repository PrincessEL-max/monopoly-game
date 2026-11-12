(() => {
  const CHANNEL = 'monopoli-game-menu';
  const send = (type, detail) => {
    if (window.parent === window) return;
    window.parent.postMessage({ channel: CHANNEL, type, detail }, window.location.origin);
  };

  const handlers = [
    'offline', 'online', 'back', 'save', 'start', 'quick', 'quickcancel',
    'quickfound', 'create', 'join', 'roominvite', 'roombot', 'roomremove',
    'disband', 'invite', 'friendsearch', 'addfriend',
  ];
  handlers.forEach((name) => {
    GameMenu.on(name, (detail) => {
      if (name === 'quick') GameMenu._liveMatch = true;
      if (name === 'roominvite' || name === 'roombot' || name === 'roomremove') {
        GameMenu._liveRoom = true;
      }
      if (name === 'friendsearch' || name === 'addfriend') GameMenu._liveSearch = true;
      send(name, detail);
    });
  });

  window.addEventListener('menu:settings', (event) => send('settings', event.detail));

  GameMenu._live = true;
  GameMenu._liveMatch = true;
  GameMenu._liveRoom = true;
  GameMenu._liveSearch = true;
  const handledInvites = new Set();
  GameMenu.setServerStatus({ name: 'INDONESIA', ping: 0 });
  GameMenu.setTotalOnline(0);
  GameMenu.setActivePlayers(0);
  GameMenu.setFriends([]);

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || message.channel !== 'monopoli-game-app') return;

    switch (message.type) {
      case 'toast':
        GameMenu.toast(message.detail);
        break;
      case 'room':
        GameMenu.syncRoom(message.detail);
        break;
      case 'roomCreateComplete':
        GameMenu.roomCreateComplete();
        break;
      case 'roomLeft':
        GameMenu.roomLeft();
        break;
      case 'friendAddResult':
        GameMenu.friendAddResult(message.detail);
        break;
      case 'social':
        GameMenu.setFriends(message.detail.friends || []);
        GameMenu.setFriendResults(message.detail.results || []);
        GameMenu.setServerStatus(message.detail.server || { name: 'INDONESIA', ping: 0 });
        GameMenu.setTotalOnline(message.detail.totalOnline || 0);
        GameMenu.setActivePlayers(message.detail.activePlayers || 0);
        (message.detail.invites || []).forEach((invite) => {
          if (handledInvites.has(invite.id)) return;
          handledInvites.add(invite.id);
          GameMenu.showRoomInvite(invite);
        });
        break;
      case 'match':
        (message.detail.players || []).forEach(GameMenu.matchPlayer);
        break;
      case 'estimate':
        GameMenu.matchEstimate(message.detail.seconds);
        break;
      default:
        break;
    }
  });

  send('ready');
})();
