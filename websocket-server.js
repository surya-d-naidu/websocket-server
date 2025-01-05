const WebSocket = require('ws');
const express = require('express');

// Express server to handle HTTP connections (if needed)
const app = express();

// Set up WebSocket server (on a Vercel deployment)
const wss = new WebSocket.Server({ noServer: true });

let mobileWs = null;  // Store the mobile WebSocket connection

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket connection from mobile');
  mobileWs = ws; // Save the WebSocket connection to communicate with mobile

  // Handle incoming WebSocket messages (e.g., requests from the HTTP relay server)
  ws.on('message', (message) => {
    console.log('Received message from the cloud:', message);
    // Handle the message (e.g., forward to LAN server, etc.)
  });

  // Handle WebSocket closure
  ws.on('close', () => {
    console.log('Mobile WebSocket connection closed');
    mobileWs = null;
  });
});

// Handle incoming HTTP requests (optional, in case you need to trigger WebSocket communication over HTTP)
app.post('/relay', (req, res) => {
  if (!mobileWs) {
    return res.status(500).json({ error: 'No connection to mobile' });
  }

  // Forward the incoming HTTP request to the mobile WebSocket server
  const requestData = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  };

  // Send the data to the mobile via WebSocket
  mobileWs.send(JSON.stringify(requestData));

  // Await response from mobile
  mobileWs.once('message', (response) => {
    res.status(200).json({ data: response });
  });
});

// The WebSocket server needs to hook into the HTTP server to handle upgrade requests
app.server = app.listen(8080, () => {
  console.log('WebSocket server listening on port 8080');
});

app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
