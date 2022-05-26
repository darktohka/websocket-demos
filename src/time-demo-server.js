import { WebSocketServer } from "ws";

// Létrehozunk egy WebSocket szervert, amely a 8081-as porton hallgat
const wss = new WebSocketServer({ port: 8081 });

// Várjuk, hogy jöjjön létre egy kapcsolat a szerver és egy kliens között
wss.on("connection", function connection(ws) {
  // A háttérfolyamat, amely időközönként elküldi a szerveridőt a kliensnek.
  // Ezt a háttérfolyamatot később meg tudjuk szüntetni és más háttérfolyamattal
  // tudjuk helyettesíteni, ha kéri a felhasználó
  let task;

  console.log("A new connection has been opened!");

  // Elküldjük a legújabb szerveridőt csatlakozáskor
  ws.send(Date.now());

  // Ez a függvény elindít egy háttérfolyamatot, amely elküldi a szerveridőt a kliensnek
  const setUpdateInterval = (seconds) => {
    // Ha már létezik egy háttérfolyamat, szüntessük meg
    if (task) {
      clearInterval(task);
    }

    // Hozzuk létre a háttérfolyamatot
    task = setInterval(() => {
      ws.send(Date.now());
    }, 1000 * seconds);
  };

  // A frissítések alapértelmezés szerint 2 másodpercenként jönnek át
  setUpdateInterval(2);

  // Várjuk, hogy érkezzen egy üzenet a klienstől
  ws.on("message", function message(data, isBinary) {
    // Egy WebSocket üzeneten keresztül érkezhet bináris adat is,
    // viszont minket csak a szöveges adatok érdekelnek még
    if (isBinary) {
      console.log("Received unexpected binary message.");
      return;
    }

    // Alakítsuk át az adatot egy számmá (szekundumok)
    data = data.toString();
    const seconds = parseInt(data);

    if (!seconds) {
      // Nem számadat jött át
      console.log(`Received unexpected message: ${data}`);
      return;
    }

    if (seconds > 10) {
      // Több, mint 10 másodpercet kért a felhasználó
      // Ez lehetetlen kérés
      console.log(`Received suspicious request: ${seconds} seconds.`);
      return;
    }

    console.log(`Interval requested from a client: ${seconds} seconds`);

    // Kicseréljük a háttérfolyamatot egy újjal
    setUpdateInterval(seconds);

    // Közöljük a klienssel, hogy sikeres a művelete
    const s = seconds === 1 ? "" : "s";
    ws.send(`Okay! I will send updates to you every ${seconds} second${s}.`);
  });

  // Várjuk, hogy a kliens és a szerver között megszünjön a kapcsolat
  ws.on("close", function closed(code, reason) {
    console.log(`Connection closed by client: ${code} ${reason.toString()}`);

    // A háttérfolyamatokat, amelyek ehhez a kapcsolathoz tartoznak,
    // fel kell szabadítanunk
    clearInterval(task);
  });
});

wss.on("listening", function () {
  console.log(
    `The WebSocket server is now running on port ${wss.options.port}!`
  );
});
