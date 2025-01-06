const WebSocket = require('ws');
const express = require('express');
const axios = require('axios');
const http = require('http');

const app = express();
app.use(express.json());  // Make sure Express handles JSON bodies

// Create an HTTP server
const server = http.createServer(app);

// Create WebSocket Server (attached to the HTTP server)
const wss = new WebSocket.Server({ server });

// Store the mobile WebSocket connection
let mobileWs = null;

// Handle incoming WebSocket connections
wss.on('connection', (ws) => {
  console.log('Mobile WebSocket connected');
  mobileWs = ws;  // Save the WebSocket connection for future communication

  // Handle incoming WebSocket messages (requests from the client-side server)
  ws.on('message', async (message) => {
    console.log('Received message from client-side server:', message);
    try {
      const { method, url, body, headers } = JSON.parse(message);

      // Relay the request to the mobile device's HTTP server
      const mobileUrl = `http://172.18.8.72:8080${url}`;
      const response = await axios({
        method,
        url: mobileUrl,
        data: body,  // Send the body of the request (for POST, PUT, etc.)
        headers,  // Pass any headers if needed (e.g., for authentication)
      });

      // Send back the response to the client-side server via WebSocket
      mobileWs.send(JSON.stringify({
        status: response.status,
        data: response.data,
      }));
    } catch (error) {
      console.error('Error processing request:', error);
      mobileWs.send(JSON.stringify({
        status: error.response ? error.response.status : 500,
        data: error.message || 'Error processing request',
      }));
    }
  });

  // Handle WebSocket closure
  ws.on('close', () => {
    console.log('Mobile WebSocket connection closed');
    mobileWs = null;  // Clear the mobile WebSocket connection
  });
});

// HTTP route to handle user requests (client-side server)
app.get('/jspui/exampleroute', (req, res) => {
  // You can implement custom logic here to handle specific HTTP routes
  res.json({ message: 'This is the data for /jspui/exampleroute' });
});

// HTTP route to relay requests to mobile (same as in WebSocket handler)
app.post('/relay', async (req, res) => {
  if (!mobileWs) {
    return res.status(500).json({ error: 'No WebSocket connection to mobile device' });
  }

  try {
    const { method, url, body, headers } = req.body; // Assuming JSON body from client

    // Relay the HTTP request to the mobile device's HTTP server
    const mobileUrl = `http://172.18.8.72:8080${url}`;
    const response = await axios({
      method,
      url: mobileUrl,
      data: body,  // Send the body of the request (for POST, PUT, etc.)
      headers,  // Pass any headers if needed
    });

    // Send back the response to the client-side via HTTP
    res.status(response.status).json({
      data: response.data,
    });
  } catch (error) {
    console.error('Error relaying request:', error);
    res.status(500).json({
      error: error.response ? error.response.status : 500,
      message: error.message || 'Error processing request',
    });
  }
});

// Start the HTTP + WebSocket server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
