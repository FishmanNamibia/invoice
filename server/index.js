const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = process.env.CORS_ORIGINS 
            ? process.env.CORS_ORIGINS.split(',')
            : ['http://localhost:3000', 'http://localhost:5001'];
        
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Compression (gzip)
app.use(compression());

// Request logging (Morgan)
if (isProduction) {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Log to file in production
    const accessLogStream = fs.createWriteStream(
        path.join(logsDir, 'access.log'),
        { flags: 'a' }
    );
    app.use(morgan('combined', { stream: accessLogStream }));
} else {
    // Log to console in development
    app.use(morgan('dev'));
}

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to API routes only
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: false
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/password-reset', authLimiter);

// Body parsing middleware
const bodyLimit = process.env.MAX_FILE_SIZE || '10mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// Import middleware
const { errorLogger } = require('./middleware/errorLogger');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/api/2fa', require('./routes/twoFactor'));
app.use('/api/system-admin', require('./routes/systemAdmin'));
app.use('/api/system-monitoring', require('./routes/systemMonitoring'));
app.use('/api/company', require('./routes/company'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/items', require('./routes/items'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/chart-of-accounts', require('./routes/chartOfAccounts'));
app.use('/api/general-ledger', require('./routes/generalLedger'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api', require('./routes/countries'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Financial System API is running' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build/index.html'));
    });
}

// Error handling middleware (use errorLogger first, then default handler)
app.use(errorLogger);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ 
        error: err.message || 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 DynaFinances - Bookkeeping System API`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

