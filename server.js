const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { loadStars, saveStar } = require('./api/stars');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    // Broadcast to all clients except sender
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// API routes
app.get('/api/load-stars', loadStars);
app.post('/api/save-star', saveStar);

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, req.path));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
