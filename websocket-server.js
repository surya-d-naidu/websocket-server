const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Serve static files
app.use(express.static('public'));

let esp32Client = null;
const webClients = new Set();

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');

    ws.once('message', (message) => {
        const msg = message.toString();
        
        if (msg === 'ESP32_CONNECTED') {
            if (!esp32Client) {
                esp32Client = ws;
                console.log('ESP32 connected');
                
                ws.on('close', () => {
                    console.log('ESP32 disconnected');
                    esp32Client = null;
                });
            } else {
                console.log('Duplicate ESP32 connection attempt');
                ws.close(1008, 'Only one ESP32 can connect at a time');
            }
        } else {
            // Regular web client
            webClients.add(ws);
            console.log('Web client connected');

            ws.on('close', () => {
                console.log('Web client disconnected');
                webClients.delete(ws);
            });
        }
    });

    // Handle subsequent messages
    ws.on('message', (message) => {
        const msg = message.toString();
        console.log('Received message:', msg);

        try {
            // Forward messages from web clients to ESP32
            if (webClients.has(ws) && esp32Client) {
                console.log('Forwarding to ESP32:', msg);
                esp32Client.send(msg);
            }
            // Forward messages from ESP32 to all web clients
            else if (ws === esp32Client) {
                console.log('Broadcasting to web clients:', msg);
                webClients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(msg);
                    }
                });
            }
        } catch (error) {
            console.error('Message handling error:', error);
        }
    });
});

// ESP32 connection check
setInterval(() => {
    if (!esp32Client) {
        console.log('ESP32 not connected');
    }
}, 5000);

// Handle HTTP server upgrade
httpServer.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

const port = process.env.PORT || 4000;
httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});