// server/src/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const initSocket = require('./socket');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Initialize our WebSocket server
initSocket(server);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});