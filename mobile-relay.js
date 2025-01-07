const WebSocket = require('ws');
const http = require('http');
const https = require('https');

const wsServerUrl = 'wss://websocket-server-6smo.onrender.com';
const lanServerUrl = 'http://172.18.8.72:8080/';

let ws = null;
let reconnectTimeout = null;

// Connect to WebSocket
function connectWebSocket() {
  ws = new WebSocket(wsServerUrl);

  ws.on('open', () => {
    console.log('Connected to WebSocket server');
    clearTimeout(reconnectTimeout);
  });

  ws.on('message', async (data) => {
    try {
      const request = JSON.parse(data);
      console.log('Received request:', request);

      const response = await makeHttpRequest(
        request.method,
        lanServerUrl + request.url,
        request.headers,
        request.body
      );

      response.id = request.id;
      ws.send(JSON.stringify(response)); // Send response
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ id: request.id, status: 500, data: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed. Reconnecting...');
    reconnectTimeout = setTimeout(connectWebSocket, 5000);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

// HTTP Request Helper
function makeHttpRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      method,
      headers,
      timeout: 30000,
    };

    const req = parsedUrl.protocol === 'https:' ? https.request(parsedUrl, options) : http.request(parsedUrl, options);

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.on('response', (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks);

        const contentType = res.headers['content-type'];
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: contentType.includes('image') ? data.toString('base64') : data.toString(),
        });
      });
    });

    req.on('error', (error) => reject(error));
    req.end();
  });
}

connectWebSocket();
