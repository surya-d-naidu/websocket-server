const WebSocket = require('ws');
const http = require('http');
const https = require('https');

const wsServerUrl = 'wss://websocket-server-6smo.onrender.com';
const lanServerUrl = 'http://172.18.8.72:8080/';
const reconnectInterval = 5000; // 5 seconds
const requestTimeout = 30000; // 30 seconds

let ws = null;
let reconnectTimeout = null;

function connectWebSocket() {
  ws = new WebSocket(wsServerUrl);

  ws.on('open', () => {
    console.log("Connected to WebSocket Mainframe");
    ws.send(JSON.stringify({ auth: 'my-mobile-identifier' }));
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  ws.on('message', async (data) => {
    try {
      const request = JSON.parse(data);
      console.log('Received request:', request);

      if (!request.id || !request.method || !request.url) {
        throw new Error("Invalid request format: Missing 'id', 'method', or 'url'");
      }

      const response = await makeHttpRequest(
        request.method,
        lanServerUrl + request.url,
        request.headers || {},
        request.body || null
      );

      response.id = request.id;
      ws.send(JSON.stringify(response)); // Send response back via WebSocket
    } catch (error) {
      console.error('Request error:', error);
      ws.send(
        JSON.stringify({
          id: request.id || null,
          status: 500,
          data: error.message,
        })
      );
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    reconnectTimeout = setTimeout(connectWebSocket, reconnectInterval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

function makeHttpRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      method: method,
      headers: headers,
      timeout: requestTimeout,
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

        if (contentType && (contentType.includes('image') || contentType.includes('application/pdf'))) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data.toString('base64'), // Encode binary data as base64
          });
        } else {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data.toString(),
          });
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.end();
  });
}

connectWebSocket();
