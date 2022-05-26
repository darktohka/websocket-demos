// A WebSocket objektumunk
// A kapcsolódás során végre fog jönni
let ws;

// Kapcsolódási fázisok
// Összeköttetést jelent a logika és a HTML között
const states = { true: "connected", false: "disconnected" };

function appendLog(text) {
  // Létrehozunk egy log bejegyzést az oldalon
  const logs = document.getElementById("logs");
  const log = document.createElement("span");

  log.className = "log";
  log.innerHTML = text;
  logs.appendChild(log);
}

function setWebsocketConnected(connected) {
  const state = states[connected];
  const statusElement = document.getElementById("status");

  // Frissítjük a HTML oldalt a WebSocket állapota alapján
  statusElement.className = state;
  statusElement.innerHTML = state.charAt(0).toUpperCase() + state.slice(1);

  document.getElementById("connectButton").disabled = connected;
  document.getElementById("disconnectButton").disabled = !connected;
  document.getElementById("sendInput").disabled = !connected;
  document.getElementById("sendButton").disabled = !connected;

  // Ha elveszett a kapcsolat, a mi felünkön is megpróbáljuk lezárni a kapcsolatot
  if (ws && !connected) {
    ws.close();
    ws = null;
  }
}

function connectToWebsocket() {
  if (ws) {
    // Már létesítve van egy kapcsolat
    return;
  }

  // Kikapcsoljuk a connect gombot, hogy ne lehessen spammelni azt a kapcsolódás közben
  // A kapcsolódás aszinkron művelet
  document.getElementById("connectButton").disabled = true;

  // Létrehozunk egy WebSocket kapcsolatot
  // A kapcsolat a háttérben saját magától létre jön
  ws = new WebSocket("ws://127.0.0.1:8081");

  // Ha kinyílik a kapcsolat, kell jelezni az oldalon
  ws.addEventListener("open", (event) => {
    setWebsocketConnected(true);
  });

  // Ha bezárodik a kapcsolat, kell jelezni az oldalon
  ws.addEventListener("close", (event) => {
    setWebsocketConnected(false);
  });

  ws.addEventListener("message", (event) => {
    const microseconds = parseInt(event.data);

    if (!microseconds) {
      // Ha érkezik egy üzenet, azt szeretnénk a felhasználó felé közvetíteni
      appendLog(event.data);
      return;
    }

    // Egy dátum érkezett, írjuk ki a felhasználónak átalakítva
    const date = new Date(microseconds);
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    };

    appendLog(date.toLocaleDateString("hu-HU", options));
  });
}

function disconnectFromWebsocket() {
  if (!ws) {
    // Még nincs is kapcsolat, amit le lehetne zárni
    return;
  }

  // Lezárjuk a kapcsolatot és elvetjük a WebSocket-et
  ws.close();
  ws = null;
}

function sendCurrentInterval() {
  // Elküldjük a WebSocket szervernek, hogy hány másodpercenként
  // szeretnénk frissítést
  const seconds = document.getElementById("sendInput").value;

  ws.send(seconds);
}

window.addEventListener("load", function () {
  // A WebSocket még biztos nincsen betöltve, jelezzük az oldalon
  setWebsocketConnected(false);
});
