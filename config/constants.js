// config/constants.js
// Application constants

module.exports = {
  // AuthKey.io SMS Service Configuration
  AUTHKEY: {
    API_KEY: 'e8329dd6df4d1060',
    BASE_URL: 'https://api.authkey.io', // GET API base URL
    POST_API_URL: 'https://console.authkey.io/restapi/requestjson.php', // POST API base URL
    // SMS Templates
    TEMPLATES: {
      OTP: '33188',        // OTP Fixed template
      EVENT_INVITE: '33223', // Event Invite template (was EVENT_CREATION, now used for invites)
      RSVP_REMINDER: '33225', // RSVP Reminder template
      RSVP_NOTIFICATION: '33224', // RSVP Notification to host template
      EVENT_UPDATE: '33342' // Event Update notification template
    }
  },

  // OTP Configuration
  OTP: {
    VALIDITY_MINUTES: 10,    // OTP validity in minutes
    LENGTH: 6                // OTP code length (6 digits)
  }
};

