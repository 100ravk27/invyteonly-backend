# API Examples - OTP and RSVP Reminders

## 1. Send OTP (Request OTP)

### Endpoint
`POST /auth/request-otp`

### Request Body
```json
{
  "phone_number": "8147005621",
  "country_code": "91"
}
```

### cURL Command (Localhost)
```bash
curl -X POST 'http://localhost:5000/auth/request-otp' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "phone_number": "8147005621",
    "country_code": "91"
  }'
```

### cURL Command (Production)
```bash
curl -X POST 'https://invyteonly.com/auth/request-otp' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "phone_number": "8147005621",
    "country_code": "91"
  }'
```

### Success Response (AuthKey.io enabled)
```json
{
  "success": true,
  "message": "OTP sent successfully via SMS",
  "logId": "0b282bdafa7248ffbadd6e3bdc2e0cac"
}
```

### Success Response (AuthKey.io disabled/failed - Debug mode)
```json
{
  "success": true,
  "message": "OTP sent (debug mode - SMS not sent via AuthKey.io)",
  "debug": "123456",
  "error": "AuthKey.io not configured or failed"
}
```

### Error Response
```json
{
  "error": "Phone number required"
}
```

---

## 2. Verify OTP (Complete Login Flow)

### Endpoint
`POST /auth/verify-otp`

### Request Body
```json
{
  "phone_number": "8147005621",
  "otp": "123456"
}
```

### cURL Command (Localhost)
```bash
curl -X POST 'http://localhost:5000/auth/verify-otp' \
  -H 'Content-Type: application/json' \
  --cookie-jar cookies.txt \
  --data-raw '{
    "phone_number": "8147005621",
    "otp": "123456"
  }'
```

### cURL Command (Production)
```bash
curl -X POST 'https://invyteonly.com/auth/verify-otp' \
  -H 'Content-Type: application/json' \
  --cookie-jar cookies.txt \
  --data-raw '{
    "phone_number": "8147005621",
    "otp": "123456"
  }'
```

### Test OTP (Bypass)
For testing, you can use `"otp": "000000"` which bypasses validation:

```bash
curl -X POST 'http://localhost:5000/auth/verify-otp' \
  -H 'Content-Type: application/json' \
  --cookie-jar cookies.txt \
  --data-raw '{
    "phone_number": "8147005621",
    "otp": "000000"
  }'
```

### Success Response
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "user": {
    "id": "user-uuid",
    "phone_number": "8147005621",
    "name": "John Doe",
    "is_name_set": true
  }
}
```

---

## 3. Send RSVP Reminders

### Endpoint
`POST /events/:eventId/send-reminders`

**Note:** This endpoint requires authentication (must be logged in) and only the event host can send reminders.

### Request
- **Method:** POST
- **Headers:** Content-Type: application/json
- **Authentication:** Session cookie (from verify-otp)
- **Body:** None required (event ID is in URL)

### cURL Command (Localhost)
```bash
# First, login (save cookies)
curl -X POST 'http://localhost:5000/auth/verify-otp' \
  -H 'Content-Type: application/json' \
  --cookie-jar cookies.txt \
  --data-raw '{
    "phone_number": "8147005621",
    "otp": "000000"
  }'

# Then, send reminders (replace EVENT_ID with actual event ID)
curl -X POST 'http://localhost:5000/events/EVENT_ID/send-reminders' \
  -H 'Content-Type: application/json' \
  --cookie cookies.txt \
  -v
```

### cURL Command (Production)
```bash
# First, login (save cookies)
curl -X POST 'https://invyteonly.com/auth/verify-otp' \
  -H 'Content-Type: application/json' \
  --cookie-jar cookies.txt \
  --data-raw '{
    "phone_number": "8147005621",
    "otp": "123456"
  }'

# Then, send reminders (replace EVENT_ID with actual event ID)
curl -X POST 'https://invyteonly.com/events/EVENT_ID/send-reminders' \
  -H 'Content-Type: application/json' \
  --cookie cookies.txt \
  -v
```

### Success Response (Reminders sent)
```json
{
  "success": true,
  "message": "Reminders sent to 3 out of 5 pending guests",
  "event_id": "event-uuid",
  "total": 5,
  "sent": 3,
  "failed": 2,
  "results": [
    {
      "guest_id": "8147005621",
      "guest_name": "John Doe",
      "success": true,
      "logId": "0b282bdafa7248ffbadd6e3bdc2e0cac",
      "message": "Submitted Successfully"
    },
    {
      "guest_id": "9876543210",
      "guest_name": "Jane Smith",
      "success": true,
      "logId": "1c393cebfb8359ggccee7f4ce3f1ddb",
      "message": "Submitted Successfully"
    },
    {
      "guest_id": "1234567890",
      "guest_name": "Bob Johnson",
      "success": false,
      "error": "Invalid phone number"
    }
  ]
}
```

### Success Response (No pending guests)
```json
{
  "success": true,
  "message": "No pending guests to remind",
  "event_id": "event-uuid",
  "total": 0,
  "sent": 0,
  "failed": 0,
  "results": []
}
```

### Error Responses

#### Not Authenticated
```json
{
  "error": "Unauthorized"
}
```

#### Not the Event Host
```json
{
  "error": "Only the event host can send reminders"
}
```

#### Event Not Found
```json
{
  "error": "Event not found"
}
```

#### Event is Deleted
```json
{
  "error": "Cannot send reminders for deleted events"
}
```

---

## Complete Flow Example

### Step 1: Request OTP
```bash
curl -X POST 'http://localhost:5000/auth/request-otp' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "phone_number": "8147005621",
    "country_code": "91"
  }'
```

### Step 2: Verify OTP (Login)
```bash
curl -X POST 'http://localhost:5000/auth/verify-otp' \
  -H 'Content-Type: application/json' \
  --cookie-jar cookies.txt \
  --data-raw '{
    "phone_number": "8147005621",
    "otp": "000000"
  }'
```

### Step 3: Send RSVP Reminders
```bash
curl -X POST 'http://localhost:5000/events/YOUR_EVENT_ID_HERE/send-reminders' \
  -H 'Content-Type: application/json' \
  --cookie cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" | jq
```

---

## Quick Test Script

Save this as `test_reminders.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000"  # Change to https://invyteonly.com for production
PHONE="8147005621"
EVENT_ID="your-event-id-here"  # Replace with actual event ID

echo "=== Step 1: Requesting OTP ==="
curl -X POST "${BASE_URL}/auth/request-otp" \
  -H 'Content-Type: application/json' \
  --data-raw "{
    \"phone_number\": \"${PHONE}\",
    \"country_code\": \"91\"
  }" | jq

echo -e "\n=== Step 2: Verifying OTP (using test OTP: 000000) ==="
curl -X POST "${BASE_URL}/auth/verify-otp" \
  -H 'Content-Type: application/json' \
  --cookie-jar cookies.txt \
  --data-raw "{
    \"phone_number\": \"${PHONE}\",
    \"otp\": \"000000\"
  }" | jq

echo -e "\n=== Step 3: Sending RSVP Reminders ==="
curl -X POST "${BASE_URL}/events/${EVENT_ID}/send-reminders" \
  -H 'Content-Type: application/json' \
  --cookie cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" | jq
```

Make it executable and run:
```bash
chmod +x test_reminders.sh
./test_reminders.sh
```

---

## Important Notes

1. **OTP Request:**
   - Phone number can be provided as `phone_number` or `phone`
   - Country code defaults to `91` (India) if not provided
   - OTP is valid for 10 minutes
   - If AuthKey.io is configured, OTP is sent via SMS
   - If AuthKey.io is not configured, OTP is returned in response for testing

2. **OTP Verification:**
   - Test OTP `000000` bypasses validation (for development only)
   - Creates a session cookie that must be used for authenticated requests
   - Cookie is saved to `cookies.txt` file

3. **Send Reminders:**
   - Requires authentication (session cookie from verify-otp)
   - Only the event host can send reminders
   - Only sends to guests with `rsvp_status = 'pending'`
   - Returns detailed results for each guest
   - Uses AuthKey.io template SID 33196
   - Message template: "Reminder to RSVP for {event_name}. Please share your response here: {rsvp_link} Hosted by {host_name}."

