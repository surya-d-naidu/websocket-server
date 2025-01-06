const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();

// HTTP server
const httpServer = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

let mobileWs = null;

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('WebSocket connection established');

  // If this is a connection from the mobile device, save the WebSocket connection
  if (mobileWs === null) {
    mobileWs = ws;
    console.log('Mobile device connected');
  }

  ws.on('message', async (message) => {
    try {
      console.log('Message received from main server:', message);

      // Parse the request data (method, url, headers, body)
      const { method, url, headers, body } = JSON.parse(message);

      if (mobileWs && mobileWs.readyState === WebSocket.OPEN) {
        mobileWs.send(JSON.stringify({ method, url, headers, body }));
      } else {
        console.error('Mobile device is not connected');
        ws.send(JSON.stringify({ error: 'Mobile device not connected' }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ error: 'Error processing message' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    mobileWs = null;
  });
});

httpServer.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

httpServer.listen(4000, () => {
  console.log('WebSocket server running on port 4000');
});
