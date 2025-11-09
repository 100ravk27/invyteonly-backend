// src/models/otpModel.js
// In-memory OTP storage (no database)
const otpStore = {}; // { phone_number: { otp, expiresAt, used } }

// Cleanup expired OTPs every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const phone in otpStore) {
    if (otpStore[phone].expiresAt < now) {
      delete otpStore[phone];
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired OTP(s)`);
  }
}, 10 * 60 * 1000); // 10 minutes

async function saveOTP(phone_number, otp, expiresAt) {
  // Normalize phone number and OTP to strings for consistent storage
  const normalizedPhone = String(phone_number);
  const normalizedOTP = String(otp);
  
  otpStore[normalizedPhone] = {
    otp: normalizedOTP,
    expiresAt: expiresAt.getTime(), // Store as timestamp for easy comparison
    used: false
  };
  console.log(`💾 OTP saved in memory for ${normalizedPhone}`);
  console.log(`   OTP: ${normalizedOTP}, Expires: ${new Date(expiresAt.getTime())}`);
}

async function validateOTP(phone_number, otp) {
  // Normalize phone number and OTP to strings for consistent comparison
  const normalizedPhone = String(phone_number);
  const normalizedOTP = String(otp);
  
  console.log(`🔍 Validating OTP for ${normalizedPhone}`);
  console.log(`🔍 Stored OTPs:`, Object.keys(otpStore));
  
  const record = otpStore[normalizedPhone];
  
  // Check if OTP exists
  if (!record) {
    console.log(`❌ No OTP found for ${normalizedPhone}`);
    console.log(`📋 Available phone numbers:`, Object.keys(otpStore));
    return false;
  }
  
  console.log(`📋 Found record:`, { 
    storedOTP: record.otp, 
    providedOTP: normalizedOTP,
    expiresAt: new Date(record.expiresAt),
    used: record.used,
    now: new Date()
  });
  
  // Check if already used
  if (record.used) {
    console.log(`❌ OTP already used for ${normalizedPhone}`);
    return false;
  }
  
  // Check if OTP matches (compare as strings)
  if (String(record.otp) !== normalizedOTP) {
    console.log(`❌ Invalid OTP for ${normalizedPhone}`);
    console.log(`   Expected: "${record.otp}" (type: ${typeof record.otp})`);
    console.log(`   Received: "${normalizedOTP}" (type: ${typeof normalizedOTP})`);
    return false;
  }
  
  // Check if expired
  if (Date.now() > record.expiresAt) {
    console.log(`❌ OTP expired for ${normalizedPhone}`);
    console.log(`   Expires at: ${new Date(record.expiresAt)}`);
    console.log(`   Current time: ${new Date()}`);
    delete otpStore[normalizedPhone]; // Clean up expired OTP
    return false;
  }
  
  // Mark as used
  record.used = true;
  console.log(`✅ OTP validated for ${normalizedPhone}`);
  return true;
}

module.exports = { saveOTP, validateOTP };
