const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

let mobileWs = null;
const clientWs = new Set();

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');

    ws.once('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received authentication message:', data);

            if (data.auth === process.env.MOBILE_IDENTIFIER) {
                console.log("Authentication successful for mobile device");

                if (!mobileWs) {
                    mobileWs = ws;
                    console.log('Mobile device connected');

                    ws.on('close', () => {
                        console.log('Mobile device disconnected');
                        mobileWs = null;
                    });
                } else {
                    console.log('Another mobile device is already connected. Closing connection.');
                    ws.close(1008, 'Duplicate mobile connection');
                }
            } else {
                console.log("Authentication failed for client");
                clientWs.add(ws);
                console.log('Client connected');

                ws.on('close', () => {
                    console.log('Client disconnected');
                    clientWs.delete(ws);
                });
            }
        } catch (error) {
            console.error('Error parsing authentication message:', error.message);
            ws.close(1008, 'Invalid message format');
        }
    });

    // Handle subsequent messages after authentication
    ws.on('message', (message) => {
        console.log('Received message:', message);

        try {
            // Forward message from client to mobile device
            if (clientWs.has(ws) && mobileWs) {
                console.log('Forwarding message from client to mobile device');
                mobileWs.send(message);
            }
            // Forward message from mobile device to all clients
            else if (ws === mobileWs) {
                console.log('Forwarding message from mobile device to clients');
                for (const client of clientWs) {
                    client.send(message);
                }
            } else {
                console.log('Message received from an unrecognized WebSocket');
            }
        } catch (error) {
            console.error('Message processing error:', error);
            ws.send(
                JSON.stringify({
                    error: "Relay server encountered an error. Please try again later.",
                })
            );
        }
    });
});

// Check if no mobile device is connected
setInterval(() => {
    if (!mobileWs) {
        console.log('No mobile device connected');
    }
}, 5000); // Check every 5 seconds

httpServer.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
});
