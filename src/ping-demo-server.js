import { WebSocketServer } from "ws";

// Létrehozunk egy WebSocket szervert, amely a 8080-as porton hallgat
const wss = new WebSocketServer({ port: 8080 });

// Várjuk, hogy jöjjön létre egy kapcsolat a szerver és egy kliens között
wss.on("connection", function connection(ws) {
  console.log("A new connection has been opened!");

  // Küldünk egyből egy üzenetet az új kliensnek
  ws.send("Welcome to WebSocket!");

  // Várjuk, hogy érkezzen egy üzenet a klienstől
  ws.on("message", function message(data, isBinary) {
    // Egy WebSocket üzeneten keresztül érkezhet bináris adat is,
    // viszont minket csak a szöveges adatok érdekelnek még
    if (isBinary) {
      console.log("Received unexpected binary message.");
      return;
    }

    // Az adatok mindig egy Buffer-ben érkeznek
    // Ezt átalakítjuk egy sztringgé
    data = data.toString();
    console.log(`New message received from a client: ${data}`);

    // Visszaküldjük a szöveg nagybetűsített változatát a kliensnek
    ws.send(data.toUpperCase());
  });

  // Várjuk, hogy a kliens és a szerver között megszünjön a kapcsolat
  ws.on("close", function closed(code, reason) {
    console.log(`Connection closed by client: ${code} ${reason.toString()}`);
  });
});

wss.on("listening", function listening() {
  console.log(
    `The WebSocket server is now running on port ${wss.options.port}!`
  );
});
