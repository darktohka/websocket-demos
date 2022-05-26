// Az összes játék fázis
const GameState = {
  CHOOSING_NAME: "CHOOSING_NAME",
  WAITING_FOR_GAME: "WAITING_FOR_GAME",
  GAME_BEGAN: "GAME_BEGAN",
  CLICK_BUTTON: "CLICK_BUTTON",
  WINNER_CHOSEN: "WINNER_CHOSEN",
};

// A mostani játék fázis
let gameState = GameState.CHOOSING_NAME;

// A játékos neve, a játékos fogja beállítani
let playerName;

// A WebSocket objektumunk
// A kapcsolódás során végre fog jönni
let ws;

function sendPacket(packet) {
  // Küld egy JSON üzenetet a WebSocket szervernek.
  ws.send(JSON.stringify(packet));
}

function addPlayerToTable(player) {
  // Hozzáadjuk a játékost a játékos táblához
  const { uuid, name } = player;

  const row = document.createElement("tr");
  const playerUUIDColumn = document.createElement("td");
  const playerNameColumn = document.createElement("td");

  playerUUIDColumn.innerText = uuid;
  playerNameColumn.innerText = name;

  row.appendChild(playerUUIDColumn);
  row.appendChild(playerNameColumn);

  const tableBody = document.getElementById("playerTableBody");

  tableBody.appendChild(row);
}

function getPlayerFromTableByUUID(uuid) {
  // Visszatéríti a játékost a táblából az UUID-ja alapján
  const tableBody = document.getElementById("playerTableBody");

  for (const entry of tableBody.children) {
    if (entry.children[0].innerText === uuid) {
      return entry;
    }
  }
}

function removePlayerFromTable(player) {
  // Kitörli a játékost a táblából
  const { uuid } = player;
  const tableBody = document.getElementById("playerTableBody");
  const playerEntry = getPlayerFromTableByUUID(uuid);

  if (playerEntry) {
    tableBody.removeChild(playerEntry);
  }
}

function setGameState(state) {
  // Beállítja az aktuális játék fázist
  gameState = state;

  switch (gameState) {
    case GameState.GAME_BEGAN:
      // Elindult a játék, mutassuk meg a "készülj fel" üzenetet
      document.getElementById("gameWait").style.display = "none";
      document.getElementById("gameAnticipation").style.display = "block";
      break;
    case GameState.CLICK_BUTTON:
      // Megjelent a gomb! Rakjuk el valahova a képernyőn belül!
      const height = document.documentElement.clientHeight;
      const width = document.documentElement.clientWidth;
      const button = document.getElementById("winButton");
      const randY = Math.floor(
        Math.random() * ((height - button.clientHeight) / 2) + 1
      );
      const randX = Math.floor(
        Math.random() * ((width - button.clientWidth) / 2) + 1
      );

      button.style.transform = `translate(${randX}px, ${randY}px)`;

      document.getElementById("gameAnticipation").style.display = "none";
      document.getElementById("gameButton").style.display = "block";
      break;
    default:
      break;
  }
}

function connectToWebsocket() {
  if (ws) {
    // Már létesítve van egy kapcsolat
    return;
  }

  // Létrehozunk egy WebSocket kapcsolatot
  // A kapcsolat a háttérben saját magától létre jön
  ws = new WebSocket("ws://127.0.0.1:8082");

  // Ha kinyílik a kapcsolat, el kell küldjük a játékosunk nevét
  ws.addEventListener("open", (event) => {
    sendPacket({ type: "joinGame", name: playerName });
  });

  ws.addEventListener("message", (event) => {
    // Jött egy üzenet, alakítsuk át JSON-ba...
    try {
      data = JSON.parse(event.data);
    } catch {
      console.log("Received invalid JSON data.");
      return;
    }

    // Az üzenet típusa alapján tudni fogjuk, hogy mit kell végrehajtanunk...
    const { type } = data;

    switch (type) {
      case "gameAlreadyBegun":
        // A játék már el van kezdődve, lépjünk le a szerverről.
        // Nem tudunk belépni a játékba.
        disconnectFromWebsocket();
        document.getElementById("joinButton").disabled = false;
        alert("The game has already begun! Please try again later...");
        break;
      case "setGameState":
        // Változik a játék fázisa!
        setGameState(data.gameState);
        break;
      case "addNewPlayers":
        // Új játékosok léptek be a játékba. Adjuk őket hozzá a táblázathoz
        // és mutassuk meg magát a táblát.
        document.getElementById("intro").style.display = "none";
        document.getElementById("gameWait").style.display = "block";
        data.players.forEach((player) => addPlayerToTable(player));
        break;
      case "removePlayer":
        // Kilépett egy játékos, töröljük ki a tálbázatból.
        removePlayerFromTable(data.player);
        break;
      case "winnerChosen":
        // Megvan a győztes! Lépjünk le a szerverről és mutassuk meg a győztest!
        disconnectFromWebsocket();
        document.getElementById("winner").innerText = data.winner;
        document.getElementById("gameButton").style.display = "none";
        document.getElementById("gameWon").style.display = "block";
      default:
        // Ismeretlen jelzés érkezett a szerverről...
        console.log(`Invalid packet type received: ${type}`);
        break;
    }
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

function joinGame() {
  // Lépjünk be a játékba.
  const name = document.getElementById("nameInput").value;

  if (!name) {
    alert("You must enter your name!");
    return;
  }

  // A join gombot leállítjuk, hogy ne lehessen kétszer belépni a szerverre spammolással.
  document.getElementById("joinButton").disabled = true;

  // Állítsuk be a játékos nevét és lépjünk be a szerverre!
  playerName = name;
  connectToWebsocket();
}

function winButtonPressed() {
  // Szóljunk a szervernek, hogy nyerni szeretnénk!
  sendPacket({ type: "winGame" });
}

function backToStart() {
  // Vigyük vissza a játékost a fő oldalra.
  document.getElementById("gameWon").style.display = "none";
  document.getElementById("intro").style.display = "block";
  document.getElementById("joinButton").disabled = false;
  document.getElementById("playerTableBody").innerHTML = "";
}
