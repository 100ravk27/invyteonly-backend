# AuthKey.io SMS Integration

## Overview

AuthKey.io SMS service has been integrated into the InvyteOnly backend for:
- **OTP Verification**: Sending OTP codes via SMS (Template ID: 33188)
- **Event Invitations**: Sending event invitation SMS (Template ID: 33191)

## Environment Variables Required

Add these to your `.env` file:

```bash
# AuthKey.io Configuration
AUTHKEY_API_KEY=your_authkey_api_key_here
AUTHKEY_BASE_URL=https://console.authkey.io  # Optional, defaults to this
```

## SMS Templates Used

### 1. OTP Template (SID: 33188)
**Template**: `Your InvyteOnly OTP is {#var1#}.Please login using the code which is valid for {#var2#} minutes.Please do not share with anyone.`

**Variables**:
- `var1`: OTP code (6 digits)
- `var2`: Validity in minutes (default: 5)

**Usage**: Automatically used when requesting OTP via `/auth/request-otp`

### 2. Event Invite Template (SID: 33191)
**Template**: `{#var1#} has invited you to {#var2#} event. View Details and RSVP on the InvyteOnly app. Download here {#var3#}`

**Variables**:
- `var1`: Inviter name
- `var2`: Event name
- `var3`: App download link or event deep link

**Usage**: Call `sendEventInvite()` function when needed

## API Integration

### OTP Service

**Endpoint**: `POST /auth/request-otp`

**Request Body**:
```json
{
  "phone_number": "9876543210",
  "country_code": "91"  // Optional, defaults to "91"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**How it works**:
1. Generates 6-digit OTP locally
2. Sends SMS via AuthKey.io using template SID 33188
3. Stores OTP locally with LogID (from AuthKey.io response) for validation
4. Validates OTP locally (since template uses `{#var1#}` not `{#2fa#}`)

**Fallback Behavior**:
- If `AUTHKEY_API_KEY` is not configured, OTP is returned in response (for testing)
- If AuthKey.io fails, OTP is still stored locally (for testing)

### Event Invitation Service

**Function**: `sendEventInvite(mobile, countryCode, inviterName, eventName, downloadLink)`

**Example Usage**:
```javascript
const { sendEventInvite } = require('./services/authkeyService');

const result = await sendEventInvite(
  '9876543210',        // mobile (without country code)
  '91',                // country code
  'John Doe',          // inviter name
  'Birthday Party',    // event name
  'https://invyteonly.com/events/abc123'  // download link or event deep link
);

if (result.success) {
  console.log('Invitation sent! LogID:', result.logId);
} else {
  console.error('Failed to send invitation:', result.error);
}
```

**Response**:
```javascript
{
  success: true,
  logId: "28bf7375bb54540ba03a4eb873d4da44",
  message: "Invitation sent successfully",
  data: { /* full AuthKey.io response */ }
}
```

## Files Created/Modified

### Created Files:
- `services/authkeyService.js` - AuthKey.io service with OTP and invite functions

### Modified Files:
- `services/otpService.js` - Integrated AuthKey.io OTP sending
- `models/otpModel.js` - Added LogID storage for tracking
- `routes/authRoutes.js` - Added country_code parameter support

## Testing

### Local Testing (Without AuthKey.io)
If `AUTHKEY_API_KEY` is not set, the system will:
- Generate OTP locally
- Return OTP in response for testing
- Still validate OTP locally

### Production Testing (With AuthKey.io)
1. Set `AUTHKEY_API_KEY` in `.env`
2. Make a request to `/auth/request-otp`
3. Check your phone for SMS
4. Verify OTP using `/auth/verify-otp`

## Important Notes

### OTP Validation
- **Current Implementation**: Uses local validation (stored in memory)
- **Template Limitation**: Your OTP template uses `{#var1#}`, not `{#2fa#}`
- **2FA API**: AuthKey.io's 2FA verification API requires a template with `{#2fa#}` variable
- **Recommendation**: For now, we validate OTP locally. If you want to use AuthKey.io's 2FA verification API, create a new template with `{#2fa#}` variable.

### Phone Number Format
- The service automatically removes country code prefix if present
- Mobile number should be without leading zeros (e.g., `9876543210` not `09876543210`)
- Country code defaults to `91` (India) but can be specified

### Error Handling
- If AuthKey.io fails, the system continues with local storage (for testing)
- Logs include detailed error messages for debugging
- OTP is always stored locally regardless of SMS delivery status

## Next Steps

### Option 1: Use Current Template (Local Validation)
- ✅ Already implemented
- OTP is sent via AuthKey.io
- OTP is validated locally
- Works with your existing template (SID 33188)

### Option 2: Use AuthKey.io 2FA API (Remote Validation)
1. Create a new template in AuthKey.io with `{#2fa#}` variable:
   ```
   Your InvyteOnly OTP is {#2fa#}. Please login using the code which is valid for 5 minutes. Please do not share with anyone.
   ```
2. Get the new template SID
3. Update `authkeyService.js` to use the 2FA API
4. Update `otpService.js` to use `verifyOTPWithAuthKey()` instead of local validation

### Auto-Send Event Invitations
Currently, event invitations are **not automatically sent** when guests are added. To enable this:

1. Modify `models/guestlistModel.js` in `addGuestsToEvent()` function
2. Import `sendEventInvite` from `authkeyService.js`
3. Call `sendEventInvite()` for each guest after adding them to the database
4. Store the LogID in the database for tracking

## Support

For AuthKey.io API issues, refer to:
- [AuthKey.io Documentation](https://console.authkey.io)
- Support: hello@authkey.io

