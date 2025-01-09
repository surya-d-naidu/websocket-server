const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

let mobileWs = null; // This will store the mobile WebSocket connection
const clientWs = new Set(); // This will store the client WebSocket connections

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        try {
            // Check if the message is "we are venom" to identify the mobile device
            if (message === "we are venom" && !mobileWs) {
                // Assign the mobile device WebSocket connection
                mobileWs = ws;
                console.log('Mobile device connected');

                // Handle the mobile WebSocket closing
                ws.on('close', () => {
                    console.log('Mobile disconnected');
                    mobileWs = null;
                });
            } else if (mobileWs && message !== "we are venom") {
                // If the message is from a client (not the mobile device), forward to mobile
                if (clientWs.has(ws) && mobileWs) {
                    mobileWs.send(message);
                }
            } else if (ws !== mobileWs) {
                // If the WebSocket is not the mobile device, add it as a client
                clientWs.add(ws);
                console.log('Client connected');

                // Handle client WebSocket closing
                ws.on('close', () => {
                    console.log('Client disconnected');
                    clientWs.delete(ws);
                });

                // Forward message from mobile to the client
                if (ws !== mobileWs) {
                    ws.send(message);
                }
            }
        } catch (error) {
            console.error('Message processing error:', error);
        }
    });

    // In case the connection is from a client, we just add them to the client set
    ws.on('close', () => {
        if (mobileWs !== ws) {
            clientWs.delete(ws);
        }
    });
});

// Check if no mobile device is connected
setInterval(() => {
    if (!mobileWs) {
        console.log('No mobile device connected');
    }
}, 5000);  // Check every 5 seconds

httpServer.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
});