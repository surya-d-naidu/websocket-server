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
    const parsedMessage = JSON.parse(message);

    if (!mobileWs && parsedMessage.auth === process.env.MOBILE_IDENTIFIER) {
        mobileWs = ws;
        console.log('Mobile device connected');
        ws.send(JSON.stringify({ message: 'Connected as mobile server' }));

        ws.on('close', () => {
            console.log('Mobile device disconnected');
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
            if (clientWs.has(ws) && mobileWs) {
                mobileWs.send(message);
            }
            else if (ws === mobileWs) {
                for (const client of clientWs) {
                    client.send(message);
                }
            }
        } catch (error) {
            console.error('Message processing error:', error);
            ws.send("There's an end on our relay server, try after sometime")
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