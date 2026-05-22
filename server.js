const http = require('http');
const { WebSocketServer } = require('ws');
const client = require('prom-client');

//Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

//Custom metrics for tracking WebSocket connections
const activeConnectionsGauge = new client.Gauge({
  name: 'ws_active_connections',
  help: 'Number of active WebSocket connections',
});

const PORT = process.env.PORT || 8080;

// Create HTTP server  
const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', client.register.contentType);
    client.register.metrics().then(data => res.end(data));
  } else if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');   
  }
});

//Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  activeConnectionsGauge.inc(); // Increment active connections
  console.log(`[${new Date().toISOString()}] Client connected. Current connections: ${wss.clients.size}`);

  //Broadcast messages to all clients
  ws.on('message', (message) => {
    console.log(`[${new Date().toISOString()}] Received message: ${message}`);
    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    wsConnections.dec(); // Decrement active connections
    activeConnectionsGauge.dec();
    console.log(`[${new Date().toISOString()}] Client disconnected. Current connections: ${wss.clients.size}`);
  });
});

//Initialize server
server.listen(PORT, () => {
  console.log(`Server is listening on port http://localhost:${PORT}`);
  console.log(`Metric path: http://localhost:${PORT}/metrics`);
  console.log(`Health check path: http://localhost:${PORT}/healthz`);
});
