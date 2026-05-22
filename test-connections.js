const WebSocket = require('ws');

const TOTAL_CONNECTIONS = 15;
const URL = 'ws://localhost:8080';
const clients = [];

console.log(`Starting simulation: Opening ${TOTAL_CONNECTIONS} connections...`);

for (let i = 1; i <= TOTAL_CONNECTIONS; i++) {
  setTimeout(() => {
    const ws = new WebSocket(URL);

    ws.on('open', () => {
      console.log(`[Client ${i}] Connected successfully.`);

      // Send occasional message to create some traffic
      ws.send(JSON.stringify({ client: i, message: "Hello Kenny" }));
    });

    ws.on('error', (err) => {
      console.error(`[Client ${i}] Error:`, err.message);
    });

    clients.push(ws);
  }, i * 100); // Small delay of 100ms between connections to avoid overwhelming the server
}

// Keep the process alive for a while to allow manual inspection of metrics
setTimeout(() => {
  console.log("\nClosing all test connections...");
  clients.forEach(ws => ws.close());
  console.log("Finish simulation.");
  process.exit(0);
}, 50000);