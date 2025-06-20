import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import { contentFilter } from './filters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(join(__dirname, 'static')));
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'templates'));

// Initialize SQLite database
const db = new sqlite3.Database('messages.db');

// Create messages table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      message TEXT NOT NULL,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_filtered BOOLEAN DEFAULT 0
    )
  `);
});

// Routes

// Homepage - Display form to create new message
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'QR Letters - Send Secret Messages',
    error: null 
  });
});

// Handle message submission
app.post('/create', async (req, res) => {
  try {
    const { message, password } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.render('index', { 
        title: 'QR Letters - Send Secret Messages',
        error: 'Message cannot be empty' 
      });
    }

    // Run message through content filter
    const filterResult = contentFilter(message);
    if (filterResult.isExplicit) {
      return res.render('index', { 
        title: 'QR Letters - Send Secret Messages',
        error: 'Message contains inappropriate content and cannot be sent' 
      });
    }

    // Generate unique slug
    const slug = uuidv4();
    
    // Hash password if provided
    let passwordHash = null;
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // Store message in database
    db.run(
      'INSERT INTO messages (slug, message, password_hash, is_filtered) VALUES (?, ?, ?, ?)',
      [slug, message.trim(), passwordHash, filterResult.isExplicit ? 1 : 0],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.render('index', { 
            title: 'QR Letters - Send Secret Messages',
            error: 'Failed to save message. Please try again.' 
          });
        }

        // Generate QR code
        const messageUrl = `${req.protocol}://${req.get('host')}/message/${slug}`;
        QRCode.toDataURL(messageUrl, (err, qrCodeUrl) => {
          if (err) {
            console.error('QR Code generation error:', err);
            return res.render('index', { 
              title: 'QR Letters - Send Secret Messages',
              error: 'Failed to generate QR code. Please try again.' 
            });
          }

          // Render success page with link and QR code
          res.render('success', {
            title: 'Message Created Successfully',
            messageUrl,
            qrCodeUrl,
            hasPassword: !!passwordHash
          });
        });
      }
    );

  } catch (error) {
    console.error('Server error:', error);
    res.render('index', { 
      title: 'QR Letters - Send Secret Messages',
      error: 'An unexpected error occurred. Please try again.' 
    });
  }
});

// Display message (with password protection if needed)
app.get('/message/:slug', (req, res) => {
  const { slug } = req.params;
  
  db.get('SELECT * FROM messages WHERE slug = ?', [slug], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.render('error', { 
        title: 'Error',
        message: 'Database error occurred' 
      });
    }

    if (!row) {
      return res.render('error', { 
        title: 'Message Not Found',
        message: 'The message you\'re looking for doesn\'t exist or has been removed.' 
      });
    }

    // If message has password protection, show password form
    if (row.password_hash) {
      res.render('password', { 
        title: 'Password Required',
        slug,
        error: null 
      });
    } else {
      // Display message directly
      res.render('message', { 
        title: 'Your Message',
        message: row.message,
        createdAt: new Date(row.created_at).toLocaleString()
      });
    }
  });
});

// Handle password verification for protected messages
app.post('/message/:slug/verify', async (req, res) => {
  const { slug } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.render('password', { 
      title: 'Password Required',
      slug,
      error: 'Password is required' 
    });
  }

  db.get('SELECT * FROM messages WHERE slug = ?', [slug], async (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.render('error', { 
        title: 'Error',
        message: 'Database error occurred' 
      });
    }

    if (!row) {
      return res.render('error', { 
        title: 'Message Not Found',
        message: 'The message you\'re looking for doesn\'t exist or has been removed.' 
      });
    }

    try {
      // Verify password
      const isValidPassword = await bcrypt.compare(password, row.password_hash);
      
      if (isValidPassword) {
        // Password correct, display message
        res.render('message', { 
          title: 'Your Message',
          message: row.message,
          createdAt: new Date(row.created_at).toLocaleString()
        });
      } else {
        // Password incorrect
        res.render('password', { 
          title: 'Password Required',
          slug,
          error: 'Incorrect password. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Password verification error:', error);
      res.render('error', { 
        title: 'Error',
        message: 'An error occurred while verifying the password.' 
      });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`QR Letters server running on http://localhost:${PORT}`);
});