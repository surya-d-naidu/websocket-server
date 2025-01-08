const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

let mobileWs = null;
const clientWs = new Set();

wss.on('connection', (ws, req) => {
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

    ws.on('message', (message) => {
        try {
            // Parse incoming message to handle request IDs and message forwarding
            const msg = JSON.parse(message);
            const requestId = msg.id; // Extract request ID from message

            // If message comes from client, forward to mobile
            if (clientWs.has(ws) && mobileWs) {
                console.log(`Forwarding message from client (ID: ${requestId}) to mobile`);
                mobileWs.send(message);
            }
            // If message comes from mobile, forward to all clients
            else if (ws === mobileWs) {
                console.log(`Forwarding message from mobile (ID: ${requestId}) to clients`);
                for (const client of clientWs) {
                    client.send(message);
                }
            }
        } catch (error) {
            console.error('Message processing error:', error);
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