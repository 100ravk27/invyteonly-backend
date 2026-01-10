// src/services/otpService.js
const { DateTime } = require('luxon');
const { saveOTP, validateOTP } = require('../models/otpModel');
const { sendOTP: sendOTPViaAuthKey } = require('./authkeyService');
const constants = require('../config/constants');

function generateOTP() {
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function requestOTP(phone_number, country_code = '91') {
  const otp = generateOTP();
  const validityMinutes = constants.OTP.VALIDITY_MINUTES;
  const expiresAt = DateTime.utc().plus({ minutes: validityMinutes }).toJSDate();
  
  // Try to send OTP via AuthKey.io
  let logId = null;
  let authKeySuccess = false;
  let authKeyError = null;
  const authKeyEnabled = !!constants.AUTHKEY.API_KEY;
  
  console.log(`🔧 [OTP Service] AuthKey.io enabled: ${authKeyEnabled}, API_KEY: ${constants.AUTHKEY.API_KEY ? 'SET' : 'NOT SET'}`);
  
  if (authKeyEnabled) {
    try {
      // Extract mobile number (remove country code if present)
      let mobile = String(phone_number);
      if (mobile.startsWith(country_code)) {
        mobile = mobile.substring(country_code.length);
      }
      // Remove any leading + or 0
      mobile = mobile.replace(/^\+?0+/, '');
      
      console.log(`📤 [OTP Service] Attempting to send OTP via AuthKey.io to ${country_code}${mobile}`);
      console.log(`📤 [OTP Service] Full phone number: ${phone_number}, Extracted mobile: ${mobile}`);
      const result = await sendOTPViaAuthKey(mobile, country_code, otp, validityMinutes);
      
      if (result.success) {
        logId = result.logId;
        authKeySuccess = true;
        console.log(`✅ [OTP Service] OTP sent successfully via AuthKey.io (LogID: ${logId})`);
      } else {
        authKeyError = result.error || result.message;
        console.error(`❌ [OTP Service] Failed to send OTP via AuthKey.io:`, JSON.stringify(result, null, 2));
        console.log(`⚠️  [OTP Service] Continuing with local OTP storage`);
      }
    } catch (error) {
      authKeyError = error.message;
      console.error(`❌ [OTP Service] Exception sending OTP via AuthKey.io:`, error.message);
      console.error(`❌ [OTP Service] Error stack:`, error.stack);
      console.log(`⚠️  [OTP Service] Continuing with local OTP storage`);
    }
  } else {
    console.log(`⚠️  [OTP Service] AuthKey.io API key not configured`);
  }
  
  // Save OTP locally (always do this for validation)
  await saveOTP(phone_number, otp, expiresAt, logId);
  console.log(`📱 [OTP Service] OTP saved locally for ${phone_number}: ${otp} (expires at ${expiresAt})`);
  console.log(`📱 [OTP Service] AuthKey.io success: ${authKeySuccess}, LogID: ${logId || 'N/A'}`);
  
  return { otp, authKeySuccess, logId, authKeyError };
}

async function verifyOTP(phone_number, otp) {
  return await validateOTP(phone_number, otp);
}

module.exports = { requestOTP, verifyOTP, generateOTP };
