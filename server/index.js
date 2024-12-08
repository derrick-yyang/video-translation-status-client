
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Configurable delay (e.g., 5 to 10 seconds)
const MIN_DELAY = 5000;
const MAX_DELAY = 5000;

let status = 'pending';

const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
setTimeout(() => {
  // Randomly decide if the result is 'completed' or 'error'
  const isSuccess = Math.random() > 0.5;
  status = isSuccess ? 'completed' : 'error';
  console.log(`Status updated to: ${status}`);
  
  io.emit('statusUpdate', { status: status });
}, delay);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.emit('statusUpdate', { status: status });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// GET /status
app.get('/status', (req, res) => {
    res.json({ status: status });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
