import WebSocket from "ws";
import readline from "readline";

// Kapcsolat a Node.JS konzollal a "readline" könyvtár segítségével
// A legelső üzenet után hozzuk létre
let rl;

// Rákapcsolódunk a WebSocket szerverünkre
const ws = new WebSocket("ws://127.0.0.1:8080");

// Várjuk, hogy kapcsolódjunk a szerverhez
ws.on("open", function open() {
  console.log("Connection established with WebSocket server.");
});

// Várjuk, hogy a szerver küldjön egy üzenetet
// Minden üzenet után megkérjük a felhasználót, s
ws.on("message", function message(data) {
  console.log("Message received from server: %s", data);

  // Létrehozzuk a kapcsolatot a Node.JS konzollal
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("Please send a message to the WebSocket server:");
  }

  // Lekérünk egy üzenetet a Node.JS konzolról
  // Miután megvan az üzenetünk, elküldjük a szervernek WebSocketen keresztül
  rl.question("> ", (message) => {
    ws.send(message);
  });
});
