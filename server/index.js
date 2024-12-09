import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Map for all the jobs. Ideally, this is stored in a database
const jobs = new Map();

// Configurable delay (e.g., 2 to 5 seconds)
const MIN_DELAY = 2000;
const MAX_DELAY = 5000;
let jobId = 0;

function generateJobId() {
    jobId++;
    return jobId.toString();
}

function createJob(jobId) {
    jobs.set(jobId, { status: 'pending' });
    
    const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
    setTimeout(() => {
        const isSuccess = Math.random() > 0.5;
        const status = isSuccess ? 'completed' : 'error';
        jobs.set(jobId, { status });
        console.log(`Job ${jobId} status updated to: ${status}`);
        
        io.emit('statusUpdate', { jobId, status });
    }, delay);

    return jobId;
}

// Create a new job
app.post('/createJob', (req, res) => {
    const jobId = generateJobId();
    createJob(jobId);
    res.json({ jobId });
});

// Get status for a specific job
app.get('/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    console.log(jobs)
    console.log("jobId: ", jobId)
    const job = jobs.get(jobId);
    console.log("job: ", job)
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ jobId, status: job.status });
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', { message: error.message });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
