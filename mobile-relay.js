const WebSocket = require('ws');
const http = require('http');
const https = require('https');

const wsServerUrl = 'wss://websocket-server-6smo.onrender.com';
const lanServerUrl = 'http://172.18.8.72:8080/';

let ws = null;
let reconnectTimeout = null;

function connectWebSocket() {
  ws = new WebSocket(wsServerUrl);

  ws.on('open', () => {
    console.log('Connected to WebSocket server');
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  ws.on('message', async (data) => {
    try {
      const request = JSON.parse(data);
      console.log('Received request:', request);

      // Perform HTTP request to the LAN server
      const response = await makeHttpRequest(
        request.method,
        lanServerUrl + request.url,
        request.headers,
        request.body
      );

      response.id = request.id;
      ws.send(JSON.stringify(response)); // Send response back via WebSocket
    } catch (error) {
      console.error('Request error:', error);
      ws.send(
        JSON.stringify({
          id: request.id,
          status: 500,
          data: error.message,
        })
      );
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    reconnectTimeout = setTimeout(connectWebSocket, 5000);
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
            data: data.toString().replace(/\/jspui/g, '/source/jspui'),
          });
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.end();
  });
}

connectWebSocket();