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
            // If message comes from client, forward to mobile
            if (clientWs.has(ws) && mobileWs) {
                mobileWs.send(message);
            }
            // If message comes from mobile, find client by ID and respond
            else if (ws === mobileWs) {
                for (const client of clientWs) {
                    client.send(message);
                }
            }
        } catch (error) {
            console.error('Message processing error:', error);
        }
    });
});

httpServer.on('upgrade', (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
});

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
});