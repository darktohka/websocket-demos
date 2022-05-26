import { WebSocketServer, WebSocket } from "ws";
import { v4 } from "uuid";
import fs from "fs";

// Fájl, ami jelenléte jelzi a játék kezdetét
const StartGameFile = "START_GAME";

// Az összes játék fázis
const GameState = {
  WAITING_FOR_GAME: "WAITING_FOR_GAME",
  GAME_BEGAN: "GAME_BEGAN",
  CLICK_BUTTON: "CLICK_BUTTON",
};

// A mostani játék fázis
let gameState = GameState.WAITING_FOR_GAME;
let buttonTimeoutTask;

// Létrehozunk egy WebSocket szervert, amely a 8082-as porton hallgat
const wss = new WebSocketServer({ port: 8082 });

function between(min, max) {
  // Egy random számot térít vissza két érték között
  return Math.floor(Math.random() * (max - min) + min);
}

function sendPacketToClient(client, packet) {
  // Egy JSON üzenetet küld egy kliensnek
  client.send(JSON.stringify(packet));
}

function broadcastPacket(packet) {
  // Egy JSON üzenetet küld az összes kliensnek
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN && client.player) {
      sendPacketToClient(client, packet);
    }
  });
}

function setGameState(state) {
  // Állítsuk be a játék fázisát, és szóljunk az összes játékosnak!
  gameState = state;

  const setGameStatePacket = { type: "setGameState", gameState: state };
  broadcastPacket(setGameStatePacket);
}

function broadcastGameWinner(winner) {
  // Valaki megnyerte a játékot! A játék véget ér...
  setGameState(GameState.WAITING_FOR_GAME);

  // Már van nyertes, ezért nem kell a timeout sem...
  if (buttonTimeoutTask) {
    clearInterval(buttonTimeoutTask);
    buttonTimeoutTask = null;
  }

  // Osszuk meg a nyertes nevét mindenkivel!
  const winnerChosenPacket = { type: "winnerChosen", winner: winner };
  broadcastPacket(winnerChosenPacket);

  // A játék véget ért, dobjuk ki az összes klienst.
  wss.clients.forEach(function each(client) {
    client.close();
  });
}

function beginGame() {
  console.log("Starting game...");

  // Indul a játék! 3-7 másodperc múlva meg fog jelenni a gomb is.
  setGameState(GameState.GAME_BEGAN);

  setTimeout(() => {
    // Megjelenik a gomb!
    setGameState(GameState.CLICK_BUTTON);

    // Lehet, hogy senki nem akarja megnyomni a gombot.
    // 30 másodperc után legyen vége a játéknak magától is.
    buttonTimeoutTask = setTimeout(() => {
      broadcastGameWinner("Nobody");
    }, 30000);
  }, between(3000, 7000));
}

// Várjuk, hogy jöjjön létre egy kapcsolat a szerver és egy kliens között
wss.on("connection", function connection(ws) {
  console.log("A new connection has been opened!");

  // Várjuk, hogy érkezzen egy üzenet a klienstől
  ws.on("message", function message(data, isBinary) {
    // Egy WebSocket üzeneten keresztül érkezhet bináris adat is,
    // viszont minket csak a szöveges adatok érdekelnek még
    if (isBinary) {
      console.log("Received unexpected binary message.");
      return;
    }

    // Alakítsuk át az adatot egy JSON dokumentummá
    try {
      data = JSON.parse(data);
    } catch {
      console.log("Received invalid JSON data.");
      return;
    }

    // Az üzenet típusa alapján tudni fogjuk, hogy mit kell végrehajtanunk...
    const packetType = data.type;

    switch (packetType) {
      case "joinGame":
        // Be szeretne lépni egy játékos, megmondja nekünk a nevét is.
        if (gameState !== GameState.WAITING_FOR_GAME) {
          // A játék már elkezdődött, nem tud belépni a játékos. Szóljunk neki.
          const gameAlreadyBegunPacket = { type: "gameAlreadyBegun" };
          sendPacketToClient(ws, gameAlreadyBegunPacket);
          return;
        }

        if (ws.player) {
          // A játékos már be van lépve.
          console.log("Player tried to join the game twice.");
          return;
        }

        if (!data.name) {
          // A játékos név nélkül akar belépni.
          console.log("Received invalid player name.");
          return;
        }

        // Szóljunk az összes többi játékosnak, hogy belépett egy új játékos!
        const player = { uuid: v4(), name: data.name };
        const newPlayerPacket = {
          type: "addNewPlayers",
          players: [player],
        };

        broadcastPacket(newPlayerPacket);

        // Mentsünk le a memóriába az adatokat, amiket a játékosról tudunk...
        ws.player = player;

        // Küldjük el az új játékosnak az összes játékost, hogy tudja a tábláját felépíteni!
        const initialPlayersPacket = {
          type: "addNewPlayers",
          players: [...wss.clients]
            .filter((client) => !!client.player)
            .map((client) => client.player),
        };

        sendPacketToClient(ws, initialPlayersPacket);
        break;
      case "startGame":
        // Az egyik játékos el szeretné indítani a játékot.
        if (gameState !== GameState.WAITING_FOR_GAME) {
          // A játék már elkezdődött.
          return;
        }

        // Indítsuk el a játékot!
        beginGame();
        break;
      case "winGame":
        // A játékos megnyomta a nagy gombot, és nyerni szeretne...
        if (gameState !== GameState.CLICK_BUTTON) {
          // ...de sajnos már valaki nyert helyette.
          console.log(
            "Player tried to win game when the game was no longer active."
          );
          return;
        }

        if (!ws.player) {
          // A játékos még nincs belépve.
          console.log("Player is not logged in.");
          return;
        }

        // Ez a játékos a nyertes! Küldjük el a nevét az összes játékosnak!
        broadcastGameWinner(ws.player.name);
        break;
      default:
        console.log(`Invalid packet type received: ${packetType}`);
        break;
    }
  });

  // Várjuk, hogy a kliens és a szerver között megszünjön a kapcsolat
  ws.on("close", function closed(code, reason) {
    console.log(`Connection closed by client: ${code} ${reason.toString()}`);

    if (!ws.player) {
      // Nem adott soha nevet a játékos magának, ezért a listában sem szerepel.
      return;
    }

    // Szóljunk az összes játékosnak, hogy eltűnt ez az ember.
    const removePlayerPacket = {
      type: "removePlayer",
      player: ws.player,
    };

    // Töröljük ki, amit tudunk róla...
    ws.player = null;
    broadcastPacket(removePlayerPacket);
  });
});

function waitForGameBegin() {
  // Fél másodpercenként figyeljük, hogy létezik-e a START_GAME állomány.
  // Ha igen, akkor indítsuk el a játékot és töröljuk ki az állományt.
  setInterval(() => {
    if (
      gameState === GameState.WAITING_FOR_GAME &&
      fs.existsSync(StartGameFile)
    ) {
      beginGame();

      // Töröljük az állományt.
      try {
        fs.unlinkSync(StartGameFile);
      } catch {
        // Engedély nélkül nem biztos, hogy működik.
      }
    }
  }, 500);
}

wss.on("listening", function listening() {
  console.log(
    `The WebSocket server is now running on port ${wss.options.port}!`
  );

  waitForGameBegin();
});
