const express = require('express');
const WebSocket = require('ws');

const app = express();
const server = app.listen(8080);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  ws.on('message', (message) => {
    console.log('Received:', message);
  });
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running!');
});
