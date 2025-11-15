// src/routes/authRoutes.js
const express = require('express');
const { requestOTP, verifyOTP } = require('../services/otpService');
const { findOrCreateUser, getUserById } = require('../models/userModel');
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
      const valid = await verifyOTP(phone_number, otp);
      
      if (!valid) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
      
      const user = await findOrCreateUser(phone_number);
      req.session.userId = user.id;
      res.json({ success: true, user });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.session.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

module.exports = router;
