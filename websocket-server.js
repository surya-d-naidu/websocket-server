const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const dotenv = require('dotenv');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

let mobileWs = null;
const clientWs = new Set();

dotenv.config();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            if (!mobileWs && parsedMessage.deviceId === process.env.MOBILE_IDENTIFIER) {
                mobileWs = ws;
                console.log('Mobile device connected');
                ws.send(JSON.stringify({ message: 'Connected as mobile server' }));

                ws.on('close', () => {
                    console.log('Mobile device disconnected');
                    mobileWs = null;
                });
            } 
            // Handle messages from clients
            else if (clientWs.has(ws) && mobileWs) {
                mobileWs.send(message); // Forward to mobile server
            } 
            // Handle responses from mobile server
            else if (ws === mobileWs) {
                for (const client of clientWs) {
                    client.send(message); // Send to all connected clients
                }
            } 
            // Reject connection if device is not valid
            else {
                console.log('Unknown device connected');
                ws.send(JSON.stringify({ message: 'Device not authorized' }));
                ws.close(); // Disconnect the unauthorized device
            }
        } catch (error) {
            console.error('Message processing error:', error);
            ws.send("Relay server encountered an error. Try again later.");
        }
    });

    // Handle client disconnections
    ws.on('close', () => {
        if (clientWs.has(ws)) {
            console.log('Client disconnected');
            clientWs.delete(ws);
        }
    });
});

// Check for connected mobile device and notify clients if missing
setInterval(() => {
    if (!mobileWs) {
        console.log('No mobile device connected');
    }
}, 5000); // Check every 5 seconds

// Serve HTML message when no mobile server is connected
app.get('*', (req, res) => {
    if (!mobileWs) {
        res.status(503).send(`
            <html>
            <head>
                <title>Codecription Relay</title>
            </head>
            <body>
                <h1>Relay Server Under Maintenance</h1>
                <p>Our mobile server is currently offline. Please try again later.</p>
            </body>
            </html>
        `);
    } else {
        res.status(200).send('<h1>Relay Server is Online</h1>');
    }
});

// Upgrade HTTP to WebSocket for incoming WebSocket connections
httpServer.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

// Start HTTP server
const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
});