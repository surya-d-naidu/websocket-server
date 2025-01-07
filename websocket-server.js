const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

let mobileWs = null;
const clientWs = new Set();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  // First connection is treated as mobile
  if (!mobileWs) {
    mobileWs = ws;
    console.log('Mobile device connected');

    ws.on('close', () => {
      console.log('Mobile disconnected');
      mobileWs = null;
    });
  } else {
    clientWs.add(ws);
    console.log('Client connected');

    ws.on('close', () => {
      console.log('Client disconnected');
      clientWs.delete(ws);
    });
  }

  // Handle messages and forward between mobile and client
  ws.on('message', (message) => {
    try {
      if (clientWs.has(ws) && mobileWs) {
        mobileWs.send(message); // Forward from client to mobile
      } else if (ws === mobileWs) {
        for (const client of clientWs) {
          client.send(message); // Forward from mobile to clients
        }
      }
    } catch (error) {
      console.error('Message processing error:', error);
    }
  });

  // Heartbeat check for connection stability
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

httpServer.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`WebSocket relay server running on port ${port}`);
});
