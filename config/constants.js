// config/constants.js
// Application constants

module.exports = {
  // AuthKey.io SMS Service Configuration
  AUTHKEY: {
    API_KEY: 'e8329dd6df4d1060',
    BASE_URL: 'https://console.authkey.io',
    // SMS Templates
    TEMPLATES: {
      OTP: '33188',        // OTP Fixed template
      EVENT_INVITE: '33191' // Fixed Invite template
    }
  },

  // OTP Configuration
  OTP: {
    VALIDITY_MINUTES: 10,    // OTP validity in minutes
    LENGTH: 6                // OTP code length (6 digits)
  }
};

