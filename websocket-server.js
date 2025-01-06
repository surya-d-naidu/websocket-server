const express = require('express');
const WebSocket = require('ws');
const http = require('http');

// Create Express app
const app = express();

// Set up middleware to parse JSON bodies
app.use(express.json());

// HTTP server
const httpServer = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Store WebSocket connection to the mobile device
let mobileWs = null;

// Handle WebSocket connections (from both the main server and the mobile device)
wss.on('connection', (ws) => {
  console.log('WebSocket connection established');

  // If this is a connection from the mobile device, save the WebSocket connection
  if (mobileWs === null) {
    mobileWs = ws;
    console.log('Mobile device connected');
  }

  // Handle messages from the main server (forward them to the mobile device)
  ws.on('message', async (message) => {
    try {
      console.log('Message received from main server:', message);

      // Parse the request data
      const { method, url, headers, body } = JSON.parse(message);

      // Forward the request to the mobile device via WebSocket
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

  // Handle mobile WebSocket disconnection
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    mobileWs = null;  // Clear mobile WebSocket connection
  });
});

// Handle WebSocket upgrade from the HTTP server
httpServer.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

// Relay HTTP requests from the main server to the mobile device
app.post('/relay', async (req, res) => {
  if (!mobileWs) {
    return res.status(500).json({ error: 'No connection to mobile device' });
  }

  const { method, url, headers, body } = req;

  // Forward the HTTP request to the mobile WebSocket
  const requestPayload = {
    method,
    url,
    headers,
    body,
  };

  try {
    // Send the request to the mobile WebSocket
    mobileWs.send(JSON.stringify(requestPayload));

    // Wait for the mobile device's response
    mobileWs.once('message', (message) => {
      try {
        const response = JSON.parse(message);
        res.status(response.status || 200).json(response.data || {});
      } catch (error) {
        console.error('Error parsing WebSocket response:', error);
        res.status(500).json({ error: 'Error processing WebSocket response' });
      }
    });
  } catch (error) {
    console.error('Error forwarding request to mobile WebSocket:', error);
    res.status(500).json({ error: 'Error forwarding request to WebSocket server' });
  }
});

// Start HTTP server to receive user requests
httpServer.listen(process.env.PORT || 4000, () => {
  console.log(`WebSocket server running on port ${process.env.PORT || 4000}`);
});
