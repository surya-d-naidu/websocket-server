const WebSocket = require('ws');
const http = require('http');
const https = require('https');

// WebSocket and LAN server URLs
const wsServerUrl = 'wss://websocket-server-6smo.onrender.com'; // WebSocket server
const lanServerUrl = 'http://172.18.8.72:8080/'; // LAN server

let ws = null; // To store the WebSocket connection
let mobileWs = null; // To store the mobile device WebSocket connection
let reconnectTimeout = null;

// Function to connect to the WebSocket server
async function connectWebSocket() {
  try {
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

        // Check if the message is from the mobile device
        if (request.message && request.message === "we are venom" && !mobileWs) {
          // If this is the mobile connection message, store the WebSocket connection
          mobileWs = ws;
          console.log('Mobile device connected');
          return; // Ignore further processing of this message
        }

        // If mobileWs is defined, route the request to LAN server
        if (mobileWs) {
          // Perform HTTP request to the LAN server
          const response = await makeHttpRequest(
            request.method,
            lanServerUrl + request.url,
            request.headers,
            request.body
          );

          // Attach the request ID to the response and send it back to the WebSocket server
          response.id = request.id;
          ws.send(JSON.stringify(response));
        }
      } catch (error) {
        console.error('Request error:', error);
        // Send an error response if there was an issue processing the request
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

  } catch (error) {
    console.error('WebSocket connection error:', error);
    reconnectTimeout = setTimeout(connectWebSocket, 5000); // Retry connection
  }
}

// Function to make HTTP requests to the LAN server
function makeHttpRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      method: method,
      headers: headers,
      timeout: 30000, // 30 seconds timeout
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
          // For binary data (images, PDFs, etc.), return the data as base64
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data.toString('base64'),
          });
        } else {
          // For text data, replace "/jspui" with "/source/jspui"
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

// Start the WebSocket connection
connectWebSocket();