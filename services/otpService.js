// src/services/otpService.js
const { DateTime } = require('luxon');
const { saveOTP, validateOTP } = require('../models/otpModel');
// const { sendWhatsAppOTP } = require('./gupshupService'); // Commented out for testing

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function requestOTP(phone_number) {
  const otp = generateOTP();
  const expiresAt = DateTime.utc().plus({ minutes: 5 }).toJSDate();
  await saveOTP(phone_number, otp, expiresAt);
  
  // Commented out Gupshup for testing - OTP will be returned in response
  // await sendWhatsAppOTP(phone_number, otp);
  console.log(`📱 OTP for ${phone_number}: ${otp} (expires at ${expiresAt})`);
  
  return otp;
}

async function verifyOTP(phone_number, otp) {
  return await validateOTP(phone_number, otp);
}

module.exports = { requestOTP, verifyOTP };
