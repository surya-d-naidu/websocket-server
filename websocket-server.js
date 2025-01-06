const WebSocket = require('ws');
const express = require('express');

const app = express();
express.json();  // Handle JSON requests

// Set up WebSocket server on port 8080
const wss = new WebSocket.Server({ noServer: true });

// Mobile WebSocket connection
let mobileWs = null;

// Handle WebSocket connection (mobile device connects here)
wss.on('connection', (ws) => {
  console.log('Mobile device connected to WebSocket server');
  mobileWs = ws;

  // When the mobile device sends a message (e.g., data), forward it to the client-side
  ws.on('message', (message) => {
    console.log('Received message from mobile:', message);
  });

  // Handle WebSocket closure
  ws.on('close', () => {
    console.log('Mobile WebSocket connection closed');
    mobileWs = null;
  });
});

// Handle incoming HTTP requests from the user (client-side)
app.use(express.json());  // Make sure JSON bodies are parsed

app.post('/relay', (req, res) => {
  if (!mobileWs) {
    return res.status(500).json({ error: 'No WebSocket connection to mobile' });
  }

  const { method, url, body, headers } = req.body;

  // Send request to the mobile device through WebSocket
  const requestPayload = { method, url, body, headers };
  mobileWs.send(JSON.stringify(requestPayload));

  // Wait for the mobile device's response (via WebSocket)
  mobileWs.once('message', (message) => {
    try {
      const response = JSON.parse(message);
      res.status(response.status || 200).json(response.data || '');
    } catch (err) {
      console.error('Error processing WebSocket response:', err);
      res.status(500).json({ error: 'Failed to process mobile response' });
    }
  });
});

// HTTP server (for handling HTTP requests from the client)
const server = app.listen(8080, () => {
  console.log('WebSocket and HTTP server running on http://localhost:8080');
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
