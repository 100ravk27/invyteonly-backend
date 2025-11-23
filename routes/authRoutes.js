// src/routes/authRoutes.js
const express = require('express');
const { requestOTP, verifyOTP } = require('../services/otpService');
const { findOrCreateUser, getUserById, updateUserName } = require('../models/userModel');
const { requireAuth } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/request-otp', async (req, res) => {
    try {
      console.log('📥 Request OTP request body:', JSON.stringify(req.body, null, 2));
      // Support both 'phone_number' and 'phone' field names
      const phone_number = req.body.phone_number || req.body.phone;
      
      if (!phone_number) {
        console.error('❌ Missing phone_number in request');
        console.error('   Available fields:', Object.keys(req.body));
        return res.status(400).json({ error: 'Phone number required' });
      }
      
      const otp = await requestOTP(phone_number);
      res.json({ success: true, message: 'OTP sent', debug: otp });
    } catch (error) {
      console.error('Error requesting OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });
  
  router.post('/verify-otp', async (req, res) => {
    try {
      console.log('📥 Verify OTP request body:', JSON.stringify(req.body, null, 2));
      console.log('📥 Request headers:', req.headers['content-type']);
      
      // Support both 'phone_number' and 'phone' field names
      const phone_number = req.body.phone_number || req.body.phone;
      const otp = req.body.otp;
      
      if (!phone_number) {
        console.error('❌ Missing phone_number in request');
        console.error('   Available fields:', Object.keys(req.body));
        return res.status(400).json({ error: 'Phone number required' });
      }
      
      if (!otp) {
        console.error('❌ Missing OTP in request');
        return res.status(400).json({ error: 'OTP required' });
      }
      
      console.log(`🔍 Verifying OTP: phone=${phone_number}, otp=${otp}`);
      
      // Bypass OTP validation for testing - accept "000000" as valid
      let valid = false;
      if (otp === '000000') {
        console.log('✅ [verify-otp] Using test OTP bypass (000000)');
        valid = true;
      } else {
        valid = await verifyOTP(phone_number, otp);
      }
      
      if (!valid) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
      
      const user = await findOrCreateUser(phone_number);
      console.log('✅ [verify-otp] User found/created:', { id: user.id, phone: user.phone_number });
      
      req.session.userId = user.id;
      console.log('✅ [verify-otp] Session userId set:', req.session.userId);
      console.log('✅ [verify-otp] Session ID:', req.session.id);
      console.log('✅ [verify-otp] Full session after set:', JSON.stringify(req.session, null, 2));
      
      // Add is_name_set field based on whether name is null or not
      const is_name_set = user.name !== null && user.name !== undefined && user.name.trim() !== '';
      
      res.json({ 
        success: true, 
        user: {
          ...user,
          is_name_set
        }
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

router.get('/me', requireAuth, async (req, res) => {
  try {
    console.log('👤 [GET /me] Endpoint called');
    console.log('👤 [GET /me] req.session:', JSON.stringify(req.session || {}, null, 2));
    console.log('👤 [GET /me] req.session.userId:', req.session?.userId);
    console.log('👤 [GET /me] req.userId (from middleware):', req.userId);
    
    const userId = req.session.userId || req.userId;
    console.log('👤 [GET /me] Using userId:', userId);
    
    if (!userId) {
      console.error('❌ [GET /me] No userId found in session or req');
      return res.status(401).json({ error: 'User not found in session' });
    }
    
    const user = await getUserById(userId);
    console.log('👤 [GET /me] User from DB:', user ? { id: user.id, phone: user.phone_number } : 'NOT FOUND');
    
    if (!user) {
      console.error('❌ [GET /me] User not found in database for userId:', userId);
      return res.status(401).json({ error: 'User not found' });
    }
    
    console.log('✅ [GET /me] Successfully returning user data');
    // Add is_name_set field based on whether name is null or not
    const is_name_set = user.name !== null && user.name !== undefined && user.name.trim() !== '';
    res.json({ 
      success: true, 
      user: {
        ...user,
        is_name_set
      }
    });
  } catch (error) {
    console.error('❌ [GET /me] Error fetching user:', error);
    console.error('❌ [GET /me] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Save user name (phone_number picked from session)
router.put('/name', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
    }
    
    // Get userId from session (set by requireAuth middleware)
    const userId = req.userId || req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Update user name
    const updatedUser = await updateUserName(userId, name.trim());
    
    res.json({ 
      success: true, 
      message: 'Name updated successfully',
      user: {
        ...updatedUser,
        is_name_set: updatedUser.name !== null && updatedUser.name !== undefined && updatedUser.name.trim() !== ''
      }
    });
  } catch (error) {
    console.error('Error updating user name:', error);
    res.status(500).json({ error: 'Failed to update name', details: error.message });
  }
});

// Logout - destroy session
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || req.session.userId;
    
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Failed to logout', details: err.message });
      }
      
      // Clear the session cookie
      res.clearCookie('invyte.sid', {
        httpOnly: true,
        secure: false, // Set to true if using HTTPS
        sameSite: 'lax',
        path: '/'
      });
      
      console.log('✅ [POST /logout] Session destroyed for userId:', userId);
      res.json({ 
        success: true, 
        message: 'Logged out successfully' 
      });
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Failed to logout', details: error.message });
  }
});

module.exports = router;
