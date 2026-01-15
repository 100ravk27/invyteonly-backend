// src/services/authkeyService.js
const axios = require('axios');
const constants = require('../config/constants');

const AUTHKEY_BASE_URL = constants.AUTHKEY.BASE_URL;
const AUTHKEY_API_KEY = constants.AUTHKEY.API_KEY;

// Fixed app download link for all SMS messages
const APP_DOWNLOAD_LINK = 'https://invyteonly.com';

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

  const url = `${AUTHKEY_BASE_URL}/request`;
  const params = {
    authkey: AUTHKEY_API_KEY,
    mobile: mobile,
    country_code: countryCode,
    sid: constants.AUTHKEY.TEMPLATES.OTP, // OTP Fixed template ID (33188)
    var1: otp, // OTP code
    var2: validityMinutes.toString() // Validity in minutes
  };

  try {
    console.log(`📤 [AuthKey.io] Sending OTP to ${countryCode}${mobile}`);
    console.log(`📤 [AuthKey.io] URL: ${url}`);
    console.log(`📤 [AuthKey.io] Params:`, JSON.stringify({ ...params, authkey: `${AUTHKEY_API_KEY.substring(0, 8)}...` }, null, 2));
    
    const response = await axios.get(url, { params });
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
 * Uses Template SID 33223: "{#var1#} has invited you to {#var2#} event. View event details and send RSVP on the InvyteOnly app. Download Now {#var3#}"
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

  const url = `${AUTHKEY_BASE_URL}/request`;
  const params = {
    authkey: AUTHKEY_API_KEY,
    mobile: mobile,
    country_code: countryCode,
    sid: constants.AUTHKEY.TEMPLATES.EVENT_INVITE, // Event Invite template ID (33223)
    var1: inviterName, // Host/inviter name
    var2: eventName, // Event title
    var3: APP_DOWNLOAD_LINK // Fixed app download link
  };

  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://console.authkey.io',
    'referer': 'https://console.authkey.io/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
  };

  try {
    console.log(`📤 [AuthKey.io] Sending event invite to ${countryCode}${mobile}`);
    console.log(`📤 [AuthKey.io] URL: ${url}`);
    console.log(`📤 [AuthKey.io] Params:`, JSON.stringify({ ...params, authkey: `${AUTHKEY_API_KEY.substring(0, 8)}...` }, null, 2));
    
    const response = await axios.get(url, { params, headers });
    console.log(`✅ [AuthKey.io] Response status: ${response.status}`);
    console.log(`✅ [AuthKey.io] Response data:`, JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      logId: response.data?.LogID || null,
      message: response.data?.Message || 'Invitation sent successfully',
      data: response.data
    };
  } catch (error) {
    console.error('❌ [AuthKey.io] Error sending event invite:');
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Error Message:', error.message);
    console.error('   Error Stack:', error.stack);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
      message: 'Failed to send invitation via AuthKey.io'
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

  const url = `https://console.authkey.io/api/2fa_verify.php`; // 2FA verify uses different endpoint
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

/**
 * Send RSVP reminder using AuthKey.io SMS template
 * Uses Template SID 33225: "Donot forget to RSVP for upcoming {#var1#} event hosted by {#var2#}. Please share your response here: {#var3#} . InvyteOnly"
 * 
 * @param {string} mobile - Recipient mobile number (without country code)
 * @param {string} countryCode - Country code (default: "91" for India)
 * @param {string} eventName - Name of the event
 * @param {string} hostName - Name of the event host
 * @returns {Promise<Object>} - Response with LogID if successful
 */
async function sendRSVPReminder(mobile, countryCode = '91', eventName, hostName) {
  if (!AUTHKEY_API_KEY) {
    throw new Error('AUTHKEY_API_KEY is not configured');
  }

  const url = `${AUTHKEY_BASE_URL}/request`;
  const params = {
    authkey: AUTHKEY_API_KEY,
    mobile: mobile,
    country_code: countryCode,
    sid: constants.AUTHKEY.TEMPLATES.RSVP_REMINDER, // RSVP Reminder template ID (33225)
    var1: eventName, // Event name
    var2: hostName, // Host name
    var3: APP_DOWNLOAD_LINK // RSVP link or app download link
  };

  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://console.authkey.io',
    'referer': 'https://console.authkey.io/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
  };

  try {
    console.log(`📤 [AuthKey.io] Sending RSVP reminder to ${countryCode}${mobile}`);
    console.log(`📤 [AuthKey.io] URL: ${url}`);
    console.log(`📤 [AuthKey.io] Params:`, JSON.stringify({ ...params, authkey: `${AUTHKEY_API_KEY.substring(0, 8)}...` }, null, 2));
    
    const response = await axios.get(url, { params, headers });
    console.log(`✅ [AuthKey.io] Response status: ${response.status}`);
    console.log(`✅ [AuthKey.io] Response data:`, JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      logId: response.data?.LogID || null,
      message: response.data?.Message || 'Reminder sent successfully',
      data: response.data
    };
  } catch (error) {
    console.error('❌ [AuthKey.io] Error sending RSVP reminder:');
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Error Message:', error.message);
    console.error('   Error Stack:', error.stack);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
      message: 'Failed to send reminder via AuthKey.io'
    };
  }
}

/**
 * Send RSVP notification to event host when a guest responds
 * Uses Template SID 33224: "{#var1#} has responded {#var2#} for your upcoming {#var3#} event..."
 * Format: var1=Guest Name, var2=RSVP Response (Yes/No/Maybe), var3=Event Name
 * 
 * @param {string} mobile - Host mobile number (without country code)
 * @param {string} countryCode - Country code (default: "91" for India)
 * @param {string} guestName - Name of the guest who responded
 * @param {string} rsvpResponse - RSVP response: 'yes', 'no', or 'maybe' (will be formatted to Yes/No/Maybe)
 * @param {string} eventName - Name of the event
 * @returns {Promise<Object>} - Response with LogID if successful
 */
async function sendRSVPNotification(mobile, countryCode = '91', guestName, rsvpResponse, eventName) {
  if (!AUTHKEY_API_KEY) {
    throw new Error('AUTHKEY_API_KEY is not configured');
  }

  // Format RSVP response for display
  const rsvpDisplay = rsvpResponse === 'yes' ? 'Yes' : 
                      rsvpResponse === 'no' ? 'No' : 
                      rsvpResponse === 'maybe' ? 'Maybe' : rsvpResponse;

  const url = `${AUTHKEY_BASE_URL}/request`;
  const params = {
    authkey: AUTHKEY_API_KEY,
    mobile: mobile,
    country_code: countryCode,
    sid: constants.AUTHKEY.TEMPLATES.RSVP_NOTIFICATION, // RSVP Notification template ID (33224)
    var1: guestName, // Guest name
    var2: rsvpDisplay, // RSVP response (Yes/No/Maybe)
    var3: eventName // Event name
  };

  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://console.authkey.io',
    'referer': 'https://console.authkey.io/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
  };

  try {
    console.log(`📤 [AuthKey.io] Sending RSVP notification to host ${countryCode}${mobile}`);
    console.log(`📤 [AuthKey.io] URL: ${url}`);
    console.log(`📤 [AuthKey.io] Method: GET`);
    console.log(`📤 [AuthKey.io] Params:`, JSON.stringify({ ...params, authkey: `${AUTHKEY_API_KEY.substring(0, 8)}...` }, null, 2));
    
    const response = await axios.get(url, { params, headers });
    console.log(`✅ [AuthKey.io] Response status: ${response.status}`);
    console.log(`✅ [AuthKey.io] Response data:`, JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      logId: response.data?.LogID || null,
      message: response.data?.Message || 'Notification sent successfully',
      data: response.data
    };
  } catch (error) {
    console.error('❌ [AuthKey.io] Error sending RSVP notification:');
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Error Message:', error.message);
    console.error('   Error Stack:', error.stack);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
      message: 'Failed to send notification via AuthKey.io'
    };
  }
}

/**
 * Send event creation notification to host
 * Uses Template SID 33223: "{#var1#} has invited you to {#var2#} event. View event details and send RSVP on the InvyteOnly app. Download Now {#var3#}"
 * Format: var1=Host Name, var2=Event Name, var3=Fixed App URL
 * 
 * @param {string} mobile - Host mobile number (without country code)
 * @param {string} countryCode - Country code (default: "91" for India)
 * @param {string} hostName - Name of the host
 * @param {string} eventName - Name of the event
 * @returns {Promise<Object>} - Response with LogID if successful
 */
async function sendEventCreationNotification(mobile, countryCode = '91', hostName, eventName) {
  if (!AUTHKEY_API_KEY) {
    throw new Error('AUTHKEY_API_KEY is not configured');
  }

  const url = `${AUTHKEY_BASE_URL}/request`;
  const params = {
    authkey: AUTHKEY_API_KEY,
    mobile: mobile,
    country_code: countryCode,
    sid: constants.AUTHKEY.TEMPLATES.EVENT_CREATION, // Event Creation template ID (33223)
    var1: hostName, // Host name
    var2: eventName, // Event name
    var3: APP_DOWNLOAD_LINK // Fixed app download link
  };

  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://console.authkey.io',
    'referer': 'https://console.authkey.io/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
  };

  try {
    console.log(`📤 [AuthKey.io] Sending event creation notification to host ${countryCode}${mobile}`);
    console.log(`📤 [AuthKey.io] URL: ${url}`);
    console.log(`📤 [AuthKey.io] Method: GET`);
    console.log(`📤 [AuthKey.io] Params:`, JSON.stringify({ ...params, authkey: `${AUTHKEY_API_KEY.substring(0, 8)}...` }, null, 2));
    
    const response = await axios.get(url, { params, headers });
    console.log(`✅ [AuthKey.io] Response status: ${response.status}`);
    console.log(`✅ [AuthKey.io] Response data:`, JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      logId: response.data?.LogID || null,
      message: response.data?.Message || 'Notification sent successfully',
      data: response.data
    };
  } catch (error) {
    console.error('❌ [AuthKey.io] Error sending event creation notification:');
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Error Message:', error.message);
    console.error('   Error Stack:', error.stack);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
      message: 'Failed to send notification via AuthKey.io'
    };
  }
}

/**
 * Send event update notification using AuthKey.io SMS template
 * Uses Template SID 33342: "{#var1#} has made changes to the {#var2#} event. Open the app to view the latest updates now {#var3#}"
 * Format: var1=Host Name, var2=Event Name, var3=Fixed App URL
 * 
 * @param {string} mobile - Recipient mobile number (without country code)
 * @param {string} countryCode - Country code (default: "91" for India)
 * @param {string} hostName - Name of the event host
 * @param {string} eventName - Name of the event
 * @returns {Promise<Object>} - Response with LogID if successful
 */
async function sendEventUpdate(mobile, countryCode = '91', hostName, eventName) {
  if (!AUTHKEY_API_KEY) {
    throw new Error('AUTHKEY_API_KEY is not configured');
  }

  const url = `${AUTHKEY_BASE_URL}/request`;
  const params = {
    authkey: AUTHKEY_API_KEY,
    mobile: mobile,
    country_code: countryCode,
    sid: constants.AUTHKEY.TEMPLATES.EVENT_UPDATE, // Event Update template ID (33342)
    var1: hostName, // Host name
    var2: eventName, // Event name
    var3: APP_DOWNLOAD_LINK // Fixed app download link
  };

  const headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://console.authkey.io',
    'referer': 'https://console.authkey.io/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
  };

  try {
    console.log(`📤 [AuthKey.io] Sending event update notification to ${countryCode}${mobile}`);
    console.log(`📤 [AuthKey.io] URL: ${url}`);
    console.log(`📤 [AuthKey.io] Method: GET`);
    console.log(`📤 [AuthKey.io] Params:`, JSON.stringify({ ...params, authkey: `${AUTHKEY_API_KEY.substring(0, 8)}...` }, null, 2));
    
    const response = await axios.get(url, { params, headers });
    console.log(`✅ [AuthKey.io] Response status: ${response.status}`);
    console.log(`✅ [AuthKey.io] Response data:`, JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      logId: response.data?.LogID || null,
      message: response.data?.Message || 'Update notification sent successfully',
      data: response.data
    };
  } catch (error) {
    console.error('❌ [AuthKey.io] Error sending event update notification:');
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Error Message:', error.message);
    console.error('   Error Stack:', error.stack);
    
    return {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
      message: 'Failed to send update notification via AuthKey.io'
    };
  }
}

module.exports = {
  sendOTP,
  sendEventInvite,
  sendRSVPReminder,
  sendRSVPNotification,
  sendEventUpdate,
  verifyOTPWithAuthKey
};

