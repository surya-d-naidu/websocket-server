const express = require('express');
const WebSocket = require('ws');
const http = require('http');

// Initialize Express app
const app = express();

// Create an HTTP server using Express (this will handle both HTTP and WebSocket)
const server = http.createServer(app);

// Initialize WebSocket server to attach to the HTTP server
const wss = new WebSocket.Server({ server });

// WebSocket event handling
wss.on('connection', (ws) => {
  console.log('A new WebSocket client connected.');

  // Event listener for incoming messages
  ws.on('message', (message) => {
    console.log('Received message:', message.toString());

    // Broadcast the message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  // Event listener for client disconnection
  ws.on('close', () => {
    console.log('A WebSocket client disconnected.');
  });
});

// Basic HTTP route (Optional)
app.get('/', (req, res) => {
  res.send('Hello from Express HTTP server!');
});

// Start the server
const port = 3000;
server.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
