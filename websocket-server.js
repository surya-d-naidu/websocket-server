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

        // Send a welcome message to the mobile device
        ws.send(JSON.stringify({ type: 'info', message: 'Welcome Mobile Device!' }));

        ws.on('close', () => {
            console.log('Mobile disconnected');
            mobileWs = null;
        });
    } else {
        clientWs.add(ws);
        console.log('Client connected');

        // Send a welcome message to the client
        ws.send(JSON.stringify({ type: 'info', message: 'Welcome Client!' }));

        ws.on('close', () => {
            console.log('Client disconnected');
            clientWs.delete(ws);
        });
    }

    // Handle incoming messages from clients and mobile
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.type === 'data') {
                // Data message from client to mobile
                if (clientWs.has(ws) && mobileWs) {
                    mobileWs.send(JSON.stringify({ type: 'data', data: parsedMessage.data }));
                    console.log(`Client sent data to mobile: ${parsedMessage.data}`);
                }
            } else if (parsedMessage.type === 'update') {
                // Update from mobile to all clients
                if (ws === mobileWs) {
                    for (const client of clientWs) {
                        client.send(JSON.stringify({ type: 'update', data: parsedMessage.data }));
                        console.log(`Mobile sent update to client: ${parsedMessage.data}`);
                    }
                }
            } else if (parsedMessage.type === 'status') {
                // Query status from any client
                if (ws !== mobileWs) {
                    ws.send(JSON.stringify({ type: 'status', mobileStatus: mobileWs ? 'Connected' : 'Disconnected' }));
                    console.log(`Client queried mobile status: ${mobileWs ? 'Connected' : 'Disconnected'}`);
                }
            }
        } catch (error) {
            console.error('Message processing error:', error);
        }
    });

    // Periodically send info to clients about the mobile device connection status
    setInterval(() => {
        if (ws !== mobileWs) {
            ws.send(JSON.stringify({
                type: 'info',
                message: mobileWs ? 'Mobile device is connected' : 'No mobile device connected'
            }));
        }
    }, 10000); // Send every 10 seconds
});

// Check if no mobile device is connected and broadcast info
setInterval(() => {
    if (!mobileWs) {
        console.log('No mobile device connected');
        // Broadcast the info to all connected clients
        clientWs.forEach(client => {
            client.send(JSON.stringify({ type: 'info', message: 'No mobile device connected' }));
        });
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
