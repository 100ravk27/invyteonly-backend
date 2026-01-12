#!/bin/bash

# Test script for RSVP Reminders API
# Event ID: 7299a6e2-c55a-4e92-a181-59022a31abf3

BASE_URL="http://localhost:5000"  # Change to https://invyteonly.com for production
PHONE="8147005621"
EVENT_ID="7299a6e2-c55a-4e92-a181-59022a31abf3"

echo "========================================="
echo "Testing RSVP Reminders API"
echo "Event ID: ${EVENT_ID}"
echo "========================================="
echo ""

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

echo -e "\n========================================="
echo "Test Complete"
echo "========================================="

