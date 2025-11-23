# API Testing Guide - End-to-End

Base URL: `http://localhost:5000` (or your server URL)

**Important:** Save cookies to a file for session management. Replace `<EVENT_ID>`, `<WISHLIST_ITEM_ID>`, etc. with actual IDs from responses.

---

## 1. AUTHENTICATION FLOW

### 1.1 Request OTP
```bash
curl -X POST http://localhost:5000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1234567890"
  }' \
  -c cookies.txt
```

### 1.2 Verify OTP (Test OTP: 000000)
```bash
curl -X POST http://localhost:5000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1234567890",
    "otp": "000000"
  }' \
  -b cookies.txt \
  -c cookies.txt
```

**Expected Response:** Should include `is_name_set: false` if name is not set

### 1.3 Get Current User (/me)
```bash
curl -X GET http://localhost:5000/auth/me \
  -b cookies.txt
```

---

## 2. USER PROFILE

### 2.1 Save User Name
```bash
curl -X PUT http://localhost:5000/auth/name \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "John Doe"
  }'
```

### 2.2 Verify Name Saved (Get /me again)
```bash
curl -X GET http://localhost:5000/auth/me \
  -b cookies.txt
```

**Expected Response:** Should include `is_name_set: true` and `name: "John Doe"`

---

## 3. PERSONAL WISHLIST

### 3.1 Get User's Personal Wishlist
```bash
curl -X GET http://localhost:5000/wishlist \
  -b cookies.txt
```

### 3.2 Add Items to Personal Wishlist
```bash
curl -X POST http://localhost:5000/wishlist \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "items": [
      {
        "item_name": "Flowers",
        "item_url": "https://example.com/flowers"
      },
      {
        "item_name": "Chocolate Box",
        "item_url": "https://example.com/chocolate"
      },
      {
        "item_name": "Gift Card",
        "item_url": "https://example.com/giftcard"
      }
    ]
  }'
```

**Note:** Save the `id` or `wishlist_id` from response for later use

### 3.3 Get Personal Wishlist (Verify Items Added)
```bash
curl -X GET http://localhost:5000/wishlist \
  -b cookies.txt
```

### 3.4 Update Wishlist Item
```bash
curl -X PUT http://localhost:5000/wishlist/<WISHLIST_ITEM_ID> \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "item_name": "Updated Flowers",
    "item_url": "https://example.com/flowers-updated"
  }'
```

### 3.5 Delete Wishlist Item
```bash
curl -X DELETE http://localhost:5000/wishlist/<WISHLIST_ITEM_ID> \
  -b cookies.txt
```

---

## 4. EVENT CREATION (DRAFT)

### 4.1 Create Event Draft
```bash
curl -X POST http://localhost:5000/events/draft \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "My Birthday Party",
    "description": "A fun birthday celebration",
    "event_date": "2025-12-25T18:00:00.000Z",
    "venue": "My House, 123 Main St",
    "theme": "Casual",
    "guestlist": [
      {
        "name": "Alice Smith",
        "phone_number": "+1987654321"
      },
      {
        "name": "Bob Johnson",
        "phone_number": "+1555555555"
      }
    ],
    "wishlist_items": [
      {
        "gift_name": "Cake",
        "gift_url": "https://example.com/cake"
      },
      {
        "gift_name": "Balloons",
        "gift_url": "https://example.com/balloons"
      }
    ]
  }'
```

**Note:** Save the `id` from response as `<EVENT_ID>`

### 4.2 Update Event Draft (Partial Update)
```bash
curl -X POST http://localhost:5000/events/draft \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "id": "<EVENT_ID>",
    "title": "Updated Birthday Party",
    "venue": "Updated Venue Address"
  }'
```

### 4.3 Update Event Draft (Update Guestlist)
```bash
curl -X POST http://localhost:5000/events/draft \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "id": "<EVENT_ID>",
    "guestlist": [
      {
        "name": "Alice Smith",
        "phone_number": "+1987654321"
      },
      {
        "name": "New Guest",
        "phone_number": "+1777777777"
      }
    ]
  }'
```

---

## 5. EVENT CREATION (LIVE)

### 5.1 Create Live Event
```bash
curl -X POST http://localhost:5000/events \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "New Year Party",
    "description": "Celebrate the new year",
    "event_date": "2025-12-31T20:00:00.000Z",
    "venue": "Party Hall",
    "theme": "Formal",
    "guestlist": [
      {
        "name": "Charlie Brown",
        "phone_number": "+1444444444"
      }
    ],
    "wishlist_items": [
      {
        "gift_name": "Champagne",
        "gift_url": "https://example.com/champagne"
      }
    ]
  }'
```

**Note:** Save the `id` from response as `<LIVE_EVENT_ID>`

### 5.2 Create Event with Shared Wishlist Items
```bash
curl -X POST http://localhost:5000/events \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Event with Shared Wishlist",
    "description": "Using items from personal wishlist",
    "event_date": "2025-11-20T19:00:00.000Z",
    "wishlist_item_ids": ["<WISHLIST_ITEM_ID_1>", "<WISHLIST_ITEM_ID_2>"]
  }'
```

---

## 6. EVENT RETRIEVAL

### 6.1 Get All Events (Hosting + Invited)
```bash
curl -X GET http://localhost:5000/events \
  -b cookies.txt
```

**Expected Response:** 
- `hosting`: Array of events you're hosting
- `invited`: Array of events you're invited to
- Both include `is_claimed` status for wishlist items

### 6.2 Get Single Event by ID
```bash
curl -X GET http://localhost:5000/events/<EVENT_ID> \
  -b cookies.txt
```

**Expected Response:** Event with guestlist, wishlist_items (with `is_claimed` status)

---

## 7. EVENT UPDATE

### 7.1 Update Event (Full Update)
```bash
curl -X PUT http://localhost:5000/events/<EVENT_ID> \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Updated Event Title",
    "description": "Updated description",
    "event_date": "2025-12-26T18:00:00.000Z",
    "venue": "New Venue",
    "theme": "New Theme",
    "guestlist": [
      {
        "name": "Alice Smith",
        "phone_number": "+1987654321"
      },
      {
        "name": "New Guest",
        "phone_number": "+1777777777"
      }
    ],
    "wishlist_items": [
      {
        "gift_name": "New Gift",
        "gift_url": "https://example.com/new-gift"
      }
    ]
  }'
```

### 7.2 Update Event (Partial Update - Only Title)
```bash
curl -X PUT http://localhost:5000/events/<EVENT_ID> \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Just Updated Title"
  }'
```

### 7.3 Update Event Status (Publish Draft)
```bash
curl -X PUT http://localhost:5000/events/<EVENT_ID> \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "status": "live"
  }'
```

---

## 8. RSVP FUNCTIONALITY

**Important:** For RSVP testing, you need to login as a guest (different phone number)

### 8.1 Login as Guest (Alice - +1987654321)

#### 8.1a Request OTP for Guest
```bash
curl -X POST http://localhost:5000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1987654321"
  }' \
  -c guest-cookies.txt
```

#### 8.1b Verify OTP for Guest
```bash
curl -X POST http://localhost:5000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1987654321",
    "otp": "000000"
  }' \
  -b guest-cookies.txt \
  -c guest-cookies.txt
```

### 8.2 Respond to Invitation (Accept with Gift)
```bash
curl -X POST http://localhost:5000/events/<EVENT_ID>/respond \
  -H "Content-Type: application/json" \
  -b guest-cookies.txt \
  -d '{
    "rsvp_status": "yes",
    "gift_option": "gift",
    "wishlist_item_id": "<WISHLIST_ITEM_ID_FROM_EVENT>"
  }'
```

**Note:** Get `wishlist_item_id` from the event's `wishlist_items` array (use the `id` field)

### 8.3 Get RSVP Status
```bash
curl -X GET http://localhost:5000/events/<EVENT_ID>/rsvp-status \
  -b guest-cookies.txt
```

**Expected Response:**
- `status`: RSVP status (yes/no/maybe)
- `gift_option`: Selected gift option
- `wishlist_id`: ID of claimed wishlist item
- `gift_claims`: Array of claimed items

### 8.4 Respond to Invitation (Decline)
```bash
curl -X POST http://localhost:5000/events/<EVENT_ID>/respond \
  -H "Content-Type: application/json" \
  -b guest-cookies.txt \
  -d '{
    "rsvp_status": "no",
    "gift_option": "no gift"
  }'
```

### 8.5 Respond to Invitation (Accept with BYOG)
```bash
curl -X POST http://localhost:5000/events/<EVENT_ID>/respond \
  -H "Content-Type: application/json" \
  -b guest-cookies.txt \
  -d '{
    "rsvp_status": "yes",
    "gift_option": "BYOG"
  }'
```

### 8.6 Respond to Invitation (Accept with Gift Card)
```bash
curl -X POST http://localhost:5000/events/<EVENT_ID>/respond \
  -H "Content-Type: application/json" \
  -b guest-cookies.txt \
  -d '{
    "rsvp_status": "yes",
    "gift_option": "gift card"
  }'
```

### 8.7 Respond to Invitation (Maybe)
```bash
curl -X POST http://localhost:5000/events/<EVENT_ID>/respond \
  -H "Content-Type: application/json" \
  -b guest-cookies.txt \
  -d '{
    "rsvp_status": "maybe",
    "gift_option": "no gift"
  }'
```

---

## 9. VERIFY CLAIMED STATUS

### 9.1 Get Event (Verify is_claimed Status)
```bash
curl -X GET http://localhost:5000/events/<EVENT_ID> \
  -b cookies.txt
```

**Expected:** Wishlist items should show `is_claimed: true` for claimed items

### 9.2 Get Personal Wishlist (Verify Claimed Status)
```bash
curl -X GET http://localhost:5000/wishlist \
  -b cookies.txt
```

**Expected:** Items shared to events should show `is_claimed: true` if claimed

---

## 10. TESTING SCENARIOS

### Scenario 1: Complete Event Flow
1. Create event draft
2. Update draft multiple times
3. Publish draft (set status to 'live')
4. Get event and verify all data

### Scenario 2: Guest RSVP Flow
1. Host creates event with guestlist
2. Guest logs in with their phone number
3. Guest sees event in "invited" list
4. Guest responds with gift selection
5. Host verifies RSVP and gift claim

### Scenario 3: Wishlist Sharing
1. Create personal wishlist items
2. Create event and share wishlist items
3. Guest claims item
4. Verify claimed status in personal wishlist

---

## NOTES

- **Session Management:** Always use `-b cookies.txt` to maintain session
- **Test OTP:** Use `"000000"` for testing (bypasses actual OTP)
- **Replace IDs:** Replace `<EVENT_ID>`, `<WISHLIST_ITEM_ID>`, etc. with actual IDs from responses
- **Phone Numbers:** Use different phone numbers for host and guests
- **Date Format:** Use ISO 8601 format: `"2025-12-25T18:00:00.000Z"`

---

## QUICK REFERENCE

| Endpoint | Method | Auth Required |
|----------|--------|---------------|
| `/auth/request-otp` | POST | No |
| `/auth/verify-otp` | POST | No |
| `/auth/me` | GET | Yes |
| `/auth/name` | PUT | Yes |
| `/wishlist` | GET, POST | Yes |
| `/wishlist/:itemId` | PUT, DELETE | Yes |
| `/events` | GET, POST | Yes |
| `/events/draft` | POST | Yes |
| `/events/:id` | GET, PUT | Yes |
| `/events/:eventId/respond` | POST | Yes |
| `/events/:eventId/rsvp-status` | GET | Yes |

