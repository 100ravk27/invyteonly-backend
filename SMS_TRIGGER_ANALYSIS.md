# SMS Message Trigger Analysis

This document provides a comprehensive analysis of when different SMS messages are triggered in the InvyteOnly application.

## 📋 Overview

The application sends SMS messages via AuthKey.io for the following scenarios:
1. **Event Creation Notification** (Template 33223)
2. **Event Invitation** (Template 33191)
3. **RSVP Reminder** (Template 33196)
4. **RSVP Notification** (Template 33224)
5. **OTP** (Template 33188) - Not analyzed here

---

## 1. 🎉 Event Creation Notification

### Template: 33223
**Message Format**: "{#var1#} has invited you to {#var2#} event. View event details and send RSVP on the InvyteOnly app. Download Now {#var3#}"

**Variables**:
- `var1`: Host name
- `var2`: Event name
- `var3`: Fixed URL (`https://invyteonly.com/`)

### When It's Triggered

**Location**: `models/eventModel.js` → `createEvent()` function (lines 165-206)

**Trigger Condition**:
- ✅ **ONLY** when a new event is created via `POST /events`
- ✅ **NOT** triggered when saving/updating event drafts (`POST /events/draft`)
- ✅ **NOT** triggered when updating existing events (`PUT /events/:id`)

**Flow**:
1. User calls `POST /events` with event data
2. Event is created with `status: 'live'`
3. Guestlist and wishlist items are added (if provided)
4. **After successful event creation**, the system:
   - Fetches host's phone number from `users` table
   - Sends SMS notification to the host
   - Uses host's name and event title

**Code Path**:
```
POST /events
  → routes/eventRoutes.js (line 10-23)
    → models/eventModel.js:createEvent() (line 107-209)
      → services/authkeyService.js:sendEventCreationNotification() (line 337-392)
```

**Key Points**:
- ⚠️ **Only sent to the host** (event creator)
- ⚠️ **Only for new events** (not drafts or updates)
- ⚠️ **Non-blocking** - Event creation succeeds even if SMS fails
- ⚠️ **Requires host to have a phone number** in the database

**Example**:
```javascript
// Triggered when:
POST /events
{
  "title": "Birthday Party",
  "description": "Join us!",
  "guestlist": [...]
}

// Sends SMS to host:
// "Jane Smith has invited you to Birthday Party event. View event details and send RSVP on the InvyteOnly app. Download Now https://invyteonly.com/"
```

---

## 2. 📨 Event Invitation

### Template: 33191
**Message Format**: "{#var1#} has invited you to {#var2#} event. View Details and RSVP on the InvyteOnly app. Download here {#var3#}"

**Variables**:
- `var1`: Host/inviter name
- `var2`: Event name
- `var3`: Fixed URL (`https://invyteonly.com/`)

### When It's Triggered

**Location**: `models/guestlistModel.js` → `addGuestsToEvent()` function (lines 87-123)

**Trigger Conditions**:
1. ✅ When creating a new event with `guestlist` in the request body
2. ✅ When updating an event and adding new guests via `PUT /events/:id` with `guestlist`
3. ✅ When updating event guestlist via `updateEventGuestlist()` (only for newly added guests)

**Flow**:
1. Event is created/updated with `guestlist` array
2. For each guest in the `guestlist`:
   - Guest is added to `event_guests` table with `rsvp_status: 'pending'`
   - **SMS invitation is sent immediately** to the guest
   - Uses host name, event title, and fixed app URL

**Code Paths**:
```
# Path 1: Creating event with guests
POST /events { guestlist: [...] }
  → models/eventModel.js:createEvent() (line 144-150)
    → models/guestlistModel.js:addGuestsToEvent() (line 6-124)
      → services/authkeyService.js:sendEventInvite() (line 76-122)

# Path 2: Updating event with new guests
PUT /events/:id { guestlist: [...] }
  → models/eventModel.js:updateEvent() 
    → models/guestlistModel.js:updateEventGuestlist() (line 127-228)
      → models/guestlistModel.js:addGuestsToEvent() (for new guests only)
        → services/authkeyService.js:sendEventInvite()
```

**Key Points**:
- ✅ **Sent to each guest** in the guestlist
- ✅ **Only for new guests** - Existing guests don't receive duplicate invitations
- ✅ **Automatic** - No separate API call needed
- ⚠️ **Non-blocking** - Guest addition succeeds even if SMS fails

**Example**:
```javascript
// Triggered when:
POST /events
{
  "title": "Birthday Party",
  "guestlist": [
    { "name": "John Doe", "phone_number": "9876543210" },
    { "name": "Jane Smith", "phone_number": "9876543211" }
  ]
}

// Sends SMS to each guest:
// "Jane Smith has invited you to Birthday Party event. View Details and RSVP on the InvyteOnly app. Download here https://invyteonly.com/"
```

---

## 3. 🔔 RSVP Reminder

### Template: 33196
**Message Format**: "Reminder to RSVP for {#var1#}. Please share your response here: {#var2#} Hosted by {#var3#}."

**Variables**:
- `var1`: Event name
- `var2`: Fixed URL (`https://invyteonly.com/`)
- `var3`: Host name

### When It's Triggered

**Location**: `routes/eventRoutes.js` → `POST /events/:eventId/send-reminders` (lines 402-437)

**Trigger Condition**:
- ✅ **Manual trigger only** - Host must explicitly call the API endpoint
- ✅ **Only the event host** can trigger reminders
- ✅ **Only sent to guests with `rsvp_status = 'pending'`**

**Flow**:
1. Host calls `POST /events/:eventId/send-reminders`
2. System verifies:
   - User is authenticated
   - User is the event host
   - Event is not soft-deleted
3. System finds all guests with `rsvp_status = 'pending'`
4. Sends reminder SMS to each pending guest

**Code Path**:
```
POST /events/:eventId/send-reminders
  → routes/eventRoutes.js (line 402-437)
    → models/guestlistModel.js:sendRSVPReminders() (line 418-520)
      → services/authkeyService.js:sendRSVPReminder() (line 185-231)
```

**Key Points**:
- ⚠️ **Manual trigger** - Not automatic
- ⚠️ **Host-only** - Only event host can send reminders
- ✅ **Filters by status** - Only sends to guests who haven't responded (`pending`)
- ✅ **Batch operation** - Sends to all pending guests at once
- ✅ **Returns summary** - Shows how many were sent successfully

**Example**:
```bash
# Host must manually call:
POST /events/7299a6e2-c55a-4e92-a181-59022a31abf3/send-reminders

# Sends SMS to all guests with rsvp_status='pending':
# "Reminder to RSVP for Birthday Party. Please share your response here: https://invyteonly.com/ Hosted by Jane Smith."
```

---

## 4. ✅ RSVP Notification (to Host)

### Template: 33224
**Message Format**: "{#var1#} has responded {#var2#} for your upcoming {#var3#} event. Please checkout the app for more details. Download Now."

**Variables**:
- `var1`: Guest name
- `var2`: RSVP response (Yes/No/Maybe)
- `var3`: Event name

### When It's Triggered

**Location**: `models/guestlistModel.js` → `respondToInvitation()` function (lines 306-351)

**Trigger Condition**:
- ✅ **Automatic** - When a guest responds to an invitation via `POST /events/:eventId/respond`
- ✅ **Sent to the event host** (not the guest)
- ✅ **Triggered for any RSVP response** (yes, no, or maybe)

**Flow**:
1. Guest calls `POST /events/:eventId/respond` with `rsvp_status`
2. Guest's RSVP is saved to database
3. **After saving RSVP**, the system:
   - Fetches event details and host's phone number
   - Formats RSVP response (yes → "Yes", no → "No", maybe → "Maybe")
   - Sends SMS notification to the host

**Code Path**:
```
POST /events/:eventId/respond
  → routes/eventRoutes.js (line 183-274)
    → models/guestlistModel.js:respondToInvitation() (line 241-355)
      → services/authkeyService.js:sendRSVPNotification() (line 233-324)
```

**Key Points**:
- ✅ **Automatic** - No separate API call needed
- ✅ **Sent to host** - Notifies host when guest responds
- ✅ **Non-blocking** - RSVP response succeeds even if SMS fails
- ✅ **Includes formatted response** - "Yes", "No", or "Maybe"

**Example**:
```javascript
// Triggered when guest responds:
POST /events/7299a6e2-c55a-4e92-a181-59022a31abf3/respond
{
  "rsvp_status": "yes"
}

// Sends SMS to host:
// "John Doe has responded Yes for your upcoming Birthday Party event. Please checkout the app for more details. Download Now."
```

---

## 📊 Summary Table

| Message Type | Template | Trigger | Recipient | Automatic? | Manual? |
|-------------|----------|---------|-----------|------------|---------|
| **Event Creation** | 33223 | Event created (`POST /events`) | Host | ✅ Yes | ❌ No |
| **Event Invitation** | 33191 | Guests added to event | Guests | ✅ Yes | ❌ No |
| **RSVP Reminder** | 33196 | Host calls API | Pending guests | ❌ No | ✅ Yes |
| **RSVP Notification** | 33224 | Guest responds to RSVP | Host | ✅ Yes | ❌ No |

---

## 🔍 Detailed Flow Diagrams

### Event Creation Flow
```
User → POST /events
  ↓
Event Created (status: 'live')
  ↓
Guests Added (if provided) → SMS Invitations Sent
  ↓
Wishlist Items Added (if provided)
  ↓
Event Creation SMS Sent to Host ← Template 33223
  ↓
Response Returned
```

### RSVP Reminder Flow
```
Host → POST /events/:eventId/send-reminders
  ↓
Verify Host Permission
  ↓
Query Guests with rsvp_status='pending'
  ↓
For Each Pending Guest:
  → Send Reminder SMS ← Template 33196
  ↓
Return Summary (sent/failed counts)
```

### RSVP Response Flow
```
Guest → POST /events/:eventId/respond
  ↓
Save RSVP Status
  ↓
Handle Gift Selection (if applicable)
  ↓
RSVP Notification SMS Sent to Host ← Template 33224
  ↓
Response Returned
```

---

## ⚠️ Important Notes

### Event Creation Notification
- **Only triggers for new events** - Drafts and updates don't trigger this
- **Requires host phone number** - If host doesn't have a phone, SMS is skipped
- **Non-blocking** - Event creation succeeds even if SMS fails

### Event Invitations
- **Only sent to new guests** - Existing guests don't receive duplicate invitations
- **Sent during event creation OR update** - If guestlist is provided
- **Automatic** - No manual trigger needed

### RSVP Reminders
- **Manual trigger only** - Host must explicitly call the API
- **Only pending guests** - Guests who already responded won't receive reminders
- **Host-only permission** - Only event host can send reminders

### RSVP Notifications
- **Automatic** - Sent whenever a guest responds
- **Sent to host** - Notifies host of guest's response
- **All responses trigger** - Yes, No, and Maybe all trigger notifications

---

## 🧪 Testing

### Test Event Creation Notification
```bash
# Create event (triggers notification to host)
curl -X POST 'http://localhost:5000/events' \
  -H 'Content-Type: application/json' \
  --cookie cookies.txt \
  --data-raw '{
    "title": "Test Event",
    "description": "Test Description"
  }'
```

### Test RSVP Reminder
```bash
# Send reminders to pending guests
curl -X POST 'http://localhost:5000/events/7299a6e2-c55a-4e92-a181-59022a31abf3/send-reminders' \
  -H 'Content-Type: application/json' \
  --cookie cookies.txt
```

### Test RSVP Notification
```bash
# Guest responds (triggers notification to host)
curl -X POST 'http://localhost:5000/events/7299a6e2-c55a-4e92-a181-59022a31abf3/respond' \
  -H 'Content-Type: application/json' \
  --cookie cookies.txt \
  --data-raw '{
    "rsvp_status": "yes"
  }'
```

---

## 📝 Code References

- **Event Creation**: `models/eventModel.js:createEvent()` (lines 165-206)
- **Event Invitations**: `models/guestlistModel.js:addGuestsToEvent()` (lines 87-123)
- **RSVP Reminders**: `routes/eventRoutes.js` (lines 402-437) → `models/guestlistModel.js:sendRSVPReminders()` (lines 418-520)
- **RSVP Notifications**: `models/guestlistModel.js:respondToInvitation()` (lines 306-351)

