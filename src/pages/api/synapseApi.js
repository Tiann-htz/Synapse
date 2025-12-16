import { parse } from 'url';
import { query } from '../utils/db';

const handler = async (req, res) => {
  console.log('API handler called:', req.method, req.url);
  const { method } = req;
  const { pathname } = parse(req.url, true);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (method) {
      case 'POST':
        if (pathname === '/api/admin/login') {
          await handleAdminLogin(req, res);
        } else if (pathname === '/api/admin/verify-pin') {
          await handleVerifyPin(req, res);
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
      
      case 'GET':
        if (pathname === '/api/test') {
          await handleTestConnection(req, res);
        } else {
          res.status(404).json({ error: 'Endpoint not found' });
        }
        break;
      
      default:
        res.setHeader('Allow', ['POST', 'GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: error.message 
    });
  }
};

// Test database connection
async function handleTestConnection(req, res) {
  try {
    const result = await query('SELECT 1 as test');
    res.status(200).json({
      success: true,
      message: 'Database connection successful!',
      data: result
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: error.message
    });
  }
}

// Admin Login (Step 1: Username & Password)
async function handleAdminLogin(req, res) {
  try {
    const { username, password } = req.body;

    console.log('=== ADMIN LOGIN REQUEST ===');
    console.log('Username:', username);

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Query admin from database
    const admins = await query(
      'SELECT * FROM admin WHERE username = ? AND password = ?',
      [username, password]
    );

    console.log('Admin found:', admins.length);

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const admin = admins[0];

    // Return success with admin data (without pin)
    return res.status(200).json({
      success: true,
      message: 'Credentials verified. Please enter PIN.',
      requiresPin: true,
      adminId: admin.admin_id,
      adminName: admin.admin_name
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
}

// Verify PIN (Step 2: PIN Verification)
async function handleVerifyPin(req, res) {
  try {
    const { adminId, pin } = req.body;

    console.log('=== PIN VERIFICATION REQUEST ===');
    console.log('Admin ID:', adminId);

    // Validate input
    if (!adminId || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID and PIN are required'
      });
    }

    // Query admin with PIN
    const admins = await query(
      'SELECT * FROM admin WHERE admin_id = ? AND pin = ?',
      [adminId, pin]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    const admin = admins[0];

    // Return success with full admin data
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin.admin_id,
        name: admin.admin_name,
        username: admin.username
      }
    });

  } catch (error) {
    console.error('PIN verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
}

export default handler;