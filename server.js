const express       = require('express');
const http          = require('http');
const { Server }    = require('socket.io');
const cors          = require('cors');
const dotenv        = require('dotenv');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const connectDB     = require('./config/db');
const socketHandler = require('./socket/socketHandler');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

// 1 this add
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  },
});

socketHandler(io);
app.set('io', io); 

// 2 this remove
app.use(cors({
  origin: true,
  credentials: true
}));
app.options("*", cors()); 

// ─── Core Middleware ────────────────────────────────────────────────────────
app.use(helmet());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiter ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  message:  { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));
app.use('/api/doctors',       require('./routes/doctorRoutes'));
app.use('/api/appointments',  require('./routes/appointmentRoutes'));
app.use('/api/payments',      require('./routes/paymentRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/faqs', require('./routes/faqRoutes'));
// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

// ─── Global Error Handler (MUST be last) ────────────────────────────────────
app.use((err, _req, res, _next) => {
  let status  = err.statusCode || 500;
  let message = err.message    || 'Internal Server Error';

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists.`;
    status  = 400;
  }
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    status  = 400;
  }
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token.';
    status  = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token expired. Please login again.';
    status  = 401;
  }

  console.error(`[ERROR] ${status} — ${message}`);
  res.status(status).json({ success: false, message });
});

// ─── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`)
);

module.exports = app;