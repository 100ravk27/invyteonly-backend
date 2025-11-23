#!/bin/bash

# Test all APIs end-to-end
# Usage: ./test-all-apis.sh

BASE_URL="http://localhost:5000"
COOKIE_FILE="cookies.txt"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Testing All APIs End-to-End${NC}"
echo -e "${BLUE}========================================${NC}\n"

# ============================================
# 1. AUTHENTICATION FLOW
# ============================================
echo -e "${YELLOW}1. AUTHENTICATION FLOW${NC}\n"

echo -e "${GREEN}1.1 Request OTP${NC}"
curl -X POST "$BASE_URL/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1234567890"
  }' \
  -c "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}1.2 Verify OTP (using test OTP: 000000)${NC}"
curl -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1234567890",
    "otp": "000000"
  }' \
  -b "$COOKIE_FILE" \
  -c "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}1.3 Get Current User (/me)${NC}"
curl -X GET "$BASE_URL/auth/me" \
  -b "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

# ============================================
# 2. USER PROFILE
# ============================================
echo -e "${YELLOW}2. USER PROFILE${NC}\n"

echo -e "${GREEN}2.1 Save User Name${NC}"
curl -X PUT "$BASE_URL/auth/name" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "name": "John Doe"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}2.2 Get User Profile Again (verify name is saved)${NC}"
curl -X GET "$BASE_URL/auth/me" \
  -b "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

# ============================================
# 3. PERSONAL WISHLIST
# ============================================
echo -e "${YELLOW}3. PERSONAL WISHLIST${NC}\n"

echo -e "${GREEN}3.1 Get User's Personal Wishlist (should be empty initially)${NC}"
curl -X GET "$BASE_URL/wishlist" \
  -b "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}3.2 Add Items to Personal Wishlist${NC}"
curl -X POST "$BASE_URL/wishlist" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
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
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}3.3 Get Personal Wishlist (verify items added)${NC}"
curl -X GET "$BASE_URL/wishlist" \
  -b "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

# Save wishlist item ID for update/delete (you'll need to extract from response)
WISHLIST_ITEM_ID="<extract-from-response>"

echo -e "${GREEN}3.4 Update Wishlist Item${NC}"
echo -e "${YELLOW}Note: Replace WISHLIST_ITEM_ID with actual ID from previous response${NC}"
curl -X PUT "$BASE_URL/wishlist/$WISHLIST_ITEM_ID" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "item_name": "Updated Flowers",
    "item_url": "https://example.com/flowers-updated"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ============================================
# 4. EVENT CREATION (DRAFT)
# ============================================
echo -e "${YELLOW}4. EVENT CREATION (DRAFT)${NC}\n"

echo -e "${GREEN}4.1 Create Event Draft${NC}"
curl -X POST "$BASE_URL/events/draft" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
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
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Save event ID for subsequent operations
EVENT_ID="<extract-from-response>"

echo -e "${GREEN}4.2 Update Event Draft${NC}"
echo -e "${YELLOW}Note: Replace EVENT_ID with actual ID from previous response${NC}"
curl -X POST "$BASE_URL/events/draft" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "id": "'"$EVENT_ID"'",
    "title": "Updated Birthday Party",
    "venue": "Updated Venue Address"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ============================================
# 5. EVENT CREATION (LIVE)
# ============================================
echo -e "${YELLOW}5. EVENT CREATION (LIVE)${NC}\n"

echo -e "${GREEN}5.1 Create Live Event${NC}"
curl -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
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
    "wishlist_item_ids": []
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Save live event ID
LIVE_EVENT_ID="<extract-from-response>"

# ============================================
# 6. EVENT RETRIEVAL
# ============================================
echo -e "${YELLOW}6. EVENT RETRIEVAL${NC}\n"

echo -e "${GREEN}6.1 Get All Events (Hosting + Invited)${NC}"
curl -X GET "$BASE_URL/events" \
  -b "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}6.2 Get Single Event by ID${NC}"
echo -e "${YELLOW}Note: Replace EVENT_ID with actual ID${NC}"
curl -X GET "$BASE_URL/events/$EVENT_ID" \
  -b "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

# ============================================
# 7. EVENT UPDATE
# ============================================
echo -e "${YELLOW}7. EVENT UPDATE${NC}\n"

echo -e "${GREEN}7.1 Update Event${NC}"
echo -e "${YELLOW}Note: Replace EVENT_ID with actual ID${NC}"
curl -X PUT "$BASE_URL/events/$EVENT_ID" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "title": "Updated Event Title",
    "description": "Updated description",
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
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ============================================
# 8. RSVP FUNCTIONALITY
# ============================================
echo -e "${YELLOW}8. RSVP FUNCTIONALITY${NC}\n"

echo -e "${GREEN}8.1 Respond to Invitation (Accept with Gift)${NC}"
echo -e "${YELLOW}Note: Replace EVENT_ID and WISHLIST_ITEM_ID with actual IDs${NC}"
echo -e "${YELLOW}Note: This requires logging in as a guest (different phone number)${NC}"
echo -e "${YELLOW}First, login as guest: +1987654321${NC}\n"

# Login as guest (Alice)
echo -e "${GREEN}8.1a Request OTP for Guest${NC}"
curl -X POST "$BASE_URL/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1987654321"
  }' \
  -c "guest-cookies.txt" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}8.1b Verify OTP for Guest${NC}"
curl -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1987654321",
    "otp": "000000"
  }' \
  -b "guest-cookies.txt" \
  -c "guest-cookies.txt" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}8.1c Respond to Invitation${NC}"
echo -e "${YELLOW}Note: Replace EVENT_ID and WISHLIST_ITEM_ID with actual IDs${NC}"
curl -X POST "$BASE_URL/events/$EVENT_ID/respond" \
  -H "Content-Type: application/json" \
  -b "guest-cookies.txt" \
  -d '{
    "rsvp_status": "yes",
    "gift_option": "gift",
    "wishlist_item_id": "<wishlist-item-id-from-event>"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}8.2 Get RSVP Status${NC}"
curl -X GET "$BASE_URL/events/$EVENT_ID/rsvp-status" \
  -b "guest-cookies.txt" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}8.3 Respond to Invitation (Decline)${NC}"
curl -X POST "$BASE_URL/events/$EVENT_ID/respond" \
  -H "Content-Type: application/json" \
  -b "guest-cookies.txt" \
  -d '{
    "rsvp_status": "no",
    "gift_option": "no gift"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}8.4 Respond to Invitation (BYOG)${NC}"
curl -X POST "$BASE_URL/events/$EVENT_ID/respond" \
  -H "Content-Type: application/json" \
  -b "guest-cookies.txt" \
  -d '{
    "rsvp_status": "yes",
    "gift_option": "BYOG"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ============================================
# 9. WISHLIST SHARING TO EVENT
# ============================================
echo -e "${YELLOW}9. WISHLIST SHARING TO EVENT${NC}\n"

echo -e "${GREEN}9.1 Create Event with Shared Wishlist Items${NC}"
echo -e "${YELLOW}Note: Replace WISHLIST_ITEM_ID with ID from personal wishlist${NC}"
curl -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{
    "title": "Event with Shared Wishlist",
    "description": "Using items from personal wishlist",
    "event_date": "2025-11-20T19:00:00.000Z",
    "wishlist_item_ids": ["<wishlist-item-id-1>", "<wishlist-item-id-2>"]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# ============================================
# 10. CLEANUP (Optional)
# ============================================
echo -e "${YELLOW}10. CLEANUP (Optional)${NC}\n"

echo -e "${GREEN}10.1 Delete Wishlist Item${NC}"
echo -e "${YELLOW}Note: Replace WISHLIST_ITEM_ID with actual ID${NC}"
curl -X DELETE "$BASE_URL/wishlist/$WISHLIST_ITEM_ID" \
  -b "$COOKIE_FILE" \
  -w "\nStatus: %{http_code}\n\n"

echo -e "${GREEN}10.2 Logout (Clear Session)${NC}"
# Note: There's no explicit logout endpoint, but you can delete the cookie file
rm -f "$COOKIE_FILE" "guest-cookies.txt"
echo "Cookie files deleted"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  Testing Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

