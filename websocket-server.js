const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

let mobileWs = null;  // This will store the mobile WebSocket connection
const clientWs = new Set();  // This will store the client WebSocket connections

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    // Handle message reception
    ws.on('message', (message) => {
        try {
            // Parse message to handle JSON messages
            const parsedMessage = JSON.parse(message);

            // Special case: check for "we are venom" to identify the mobile device
            if (parsedMessage.message === "we are venom" && !mobileWs) {
                // Assign the first WebSocket with this message as the mobile device
                mobileWs = ws;
                console.log('Mobile device connected');
                
                // Handle mobile WebSocket closing
                ws.on('close', () => {
                    console.log('Mobile disconnected');
                    mobileWs = null; // Reset mobileWs when it disconnects
                });
            } else if (mobileWs && parsedMessage.message !== "we are venom") {
                // If the message is from a client (not the mobile device), forward it to the mobile device
                if (clientWs.has(ws) && mobileWs) {
                    mobileWs.send(message);
                }
            } else if (ws !== mobileWs) {
                // If the WebSocket is not the mobile device, it's treated as a client
                clientWs.add(ws);
                console.log('Client connected');
                
                // Handle client WebSocket closing
                ws.on('close', () => {
                    console.log('Client disconnected');
                    clientWs.delete(ws);
                });

                // Forward messages from the mobile device to this client
                if (mobileWs) {
                    ws.send(message); // Send any messages from the mobile device to clients
                }
            }
        } catch (error) {
            console.error('Message processing error:', error);
        }
    });

    // When a WebSocket connection closes, remove it from the client set if it's a client
    ws.on('close', () => {
        if (mobileWs !== ws) {
            clientWs.delete(ws);
        }
    });
});

// Check every 5 seconds if a mobile device is connected
setInterval(() => {
    if (!mobileWs) {
        console.log('No mobile device connected');
    }
}, 5000);

// WebSocket upgrade handling (for handling HTTP upgrades to WebSocket)
httpServer.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

// Start the HTTP server that handles WebSocket upgrades
const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
});
