// src/services/authkeyService.js
const axios = require('axios');
const constants = require('../config/constants');

const AUTHKEY_BASE_URL = constants.AUTHKEY.BASE_URL;
const AUTHKEY_API_KEY = constants.AUTHKEY.API_KEY;

/**
 * Send OTP using AuthKey.io SMS template
 * Uses Template SID 33188: "Your InvyteOnly OTP is {#var1#}.Please login using the code which is valid for {#var2#} minutes..."
 * 
 * @param {string} mobile - Recipient mobile number (without country code)
 * @param {string} countryCode - Country code (default: "91" for India)
 * @param {string} otp - OTP code to send
 * @param {number} validityMinutes - OTP validity in minutes (default: from constants.OTP.VALIDITY_MINUTES)
 * @returns {Promise<Object>} - Response with LogID if successful
 */
async function sendOTP(mobile, countryCode = '91', otp, validityMinutes = constants.OTP.VALIDITY_MINUTES) {
  if (!AUTHKEY_API_KEY) {
    throw new Error('AUTHKEY_API_KEY is not configured');
  }

  const url = `${AUTHKEY_BASE_URL}/restapi/requestjson.php`;
  const payload = {
    country_code: countryCode,
    mobile: mobile,
    sid: constants.AUTHKEY.TEMPLATES.OTP, // OTP Fixed template ID
    var1: otp,
    var2: validityMinutes.toString()
  };

  // AuthKey.io uses Basic auth with just the API key (not base64 encoded)
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${AUTHKEY_API_KEY}`
  };

  try {
    console.log(`📤 [AuthKey.io] Sending OTP to ${countryCode}${mobile}`);
    console.log(`📤 [AuthKey.io] URL: ${url}`);
    console.log(`📤 [AuthKey.io] Payload:`, JSON.stringify(payload, null, 2));
    console.log(`📤 [AuthKey.io] Headers:`, JSON.stringify({ ...headers, Authorization: `Basic ${AUTHKEY_API_KEY.substring(0, 8)}...` }, null, 2));
    
    const response = await axios.post(url, payload, { headers });
    console.log(`✅ [AuthKey.io] Response status: ${response.status}`);
    console.log(`✅ [AuthKey.io] Response data:`, JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      logId: response.data?.LogID || null,
      message: response.data?.Message || 'OTP sent successfully',
      data: response.data
    };
  } catch (error) {
    console.error('❌ [AuthKey.io] Error sending OTP:');
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Error Message:', error.message);
    console.error('   Error Stack:', error.stack);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
      message: 'Failed to send OTP via AuthKey.io'
    };
  }
}

/**
 * Send event invitation using AuthKey.io SMS template
 * Uses Template SID 33191: "{#var1#} has invited you to {#var2#} event. View Details and RSVP on the InvyteOnly app. Download here {#var3#}"
 * 
 * @param {string} mobile - Recipient mobile number (without country code)
 * @param {string} countryCode - Country code (default: "91" for India)
 * @param {string} inviterName - Name of the person sending the invitation
 * @param {string} eventName - Name of the event
 * @param {string} downloadLink - App download link or event deep link
 * @returns {Promise<Object>} - Response with LogID if successful
 */
async function sendEventInvite(mobile, countryCode = '91', inviterName, eventName, downloadLink) {
  if (!AUTHKEY_API_KEY) {
    throw new Error('AUTHKEY_API_KEY is not configured');
  }

  const url = `${AUTHKEY_BASE_URL}/restapi/requestjson.php`;
  const payload = {
    country_code: countryCode,
    mobile: mobile,
    sid: constants.AUTHKEY.TEMPLATES.EVENT_INVITE, // Fixed Invite template ID
    var1: inviterName,
    var2: eventName,
    var3: downloadLink
  };

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${AUTHKEY_API_KEY}`
  };

  try {
    console.log(`📤 [AuthKey.io] Sending event invite to ${countryCode}${mobile}`);
    const response = await axios.post(url, payload, { headers });
    console.log(`✅ [AuthKey.io] Event invite sent successfully:`, response.data);
    return {
      success: true,
      logId: response.data?.LogID || null,
      message: response.data?.Message || 'Invitation sent successfully',
      data: response.data
    };
  } catch (error) {
    console.error('❌ [AuthKey.io] Error sending event invite:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
      message: 'Failed to send invitation'
    };
  }
}

/**
 * Verify OTP using AuthKey.io 2FA API (if using 2FA template with {#2fa#} variable)
 * Note: This requires a template with {#2fa#} variable, not {#var1#}
 * If using template 33188, verify OTP locally instead
 * 
 * @param {string} channel - Channel type: "SMS", "VOICE", or "EMAIL"
 * @param {string} otp - OTP code entered by user
 * @param {string} logId - LogID returned from sendOTP response
 * @returns {Promise<Object>} - Verification result
 */
async function verifyOTPWithAuthKey(channel = 'SMS', otp, logId) {
  if (!AUTHKEY_API_KEY) {
    throw new Error('AUTHKEY_API_KEY is not configured');
  }

  if (!logId) {
    throw new Error('LogID is required for OTP verification');
  }

  const url = `${AUTHKEY_BASE_URL}/api/2fa_verify.php`;
  const params = {
    authkey: AUTHKEY_API_KEY,
    channel: channel,
    otp: otp,
    logid: logId
  };

  try {
    console.log(`🔍 [AuthKey.io] Verifying OTP with LogID: ${logId}`);
    const response = await axios.get(url, { params });
    console.log(`✅ [AuthKey.io] OTP verification result:`, response.data);
    
    const isValid = response.data?.status === true && response.data?.message === 'Valid OTP';
    return {
      success: isValid,
      valid: isValid,
      message: response.data?.message || 'OTP verification failed',
      data: response.data
    };
  } catch (error) {
    console.error('❌ [AuthKey.io] Error verifying OTP:', error.response?.data || error.message);
    return {
      success: false,
      valid: false,
      error: error.response?.data || error.message,
      message: 'Failed to verify OTP'
    };
  }
}

module.exports = {
  sendOTP,
  sendEventInvite,
  verifyOTPWithAuthKey
};

