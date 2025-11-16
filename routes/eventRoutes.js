// src/routes/eventRoutes.js
const express = require('express');
const { createEvent, getEventById, getAllEvents, updateEvent, getEventsByHostId, getEventsByGuestPhone, hydrateEvents } = require('../models/eventModel');
const { getUserById } = require('../models/userModel');
const { respondToInvitation } = require('../models/guestlistModel');
const { requireAuth } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const event = await createEvent(req.userId, req.body);
    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event', details: error.message });
  }
});

// Get events for the logged-in user (hosting + invited, phone resolved from session user)
router.get('/', requireAuth, async (req, res) => {
  try {
    // Resolve user and phone number from session
    const user = await getUserById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found in session' });
    }

    // Hosting events (hydrated via getAllEvents)
    const hosting = await getAllEvents(req.userId);

    // Invited events based on guestlist phone number, then hydrate
    const invitedRaw = await getEventsByGuestPhone(user.phone_number);
    const invited = await hydrateEvents(invitedRaw);

    res.json({
      success: true,
      user: { id: user.id, phone_number: user.phone_number, name: user.name || null },
      hosting,
      invited
    });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Failed to get events', details: error.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ error: 'Failed to get event', details: error.message });
  }
});

// Update event
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const event = await updateEvent(req.params.id, req.userId, req.body);
    if (!event) {
      return res.status(404).json({ error: 'Event not found or you do not have permission to update it' });
    }
    res.json({ success: true, event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event', details: error.message });
  }
});

// Respond to invitation (accept/decline/maybe) with optional gift selection
// guest_id is resolved from session (user's phone_number)
// POST /events/:eventId/respond
router.post('/:eventId/respond', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rsvp_status, gift_option, wishlist_item_id } = req.body;

    // Resolve current user and phone
    const user = await getUserById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const phoneNumber = user.phone_number;

    // Validate RSVP status
    const validRsvp = ['yes', 'no', 'maybe'];
    const rsvpStatus = (rsvp_status || '').toLowerCase();
    if (!validRsvp.includes(rsvpStatus)) {
      return res.status(400).json({ error: `Invalid rsvp_status. Allowed: ${validRsvp.join(', ')}` });
    }

    // Validate gift option if provided
    const validGiftOptions = ['BYOG', 'no gift', 'gift card', 'gift'];
    let normalizedGift = gift_option;
    if (normalizedGift !== undefined) {
      // Preserve exact strings from requirement except allow case-insensitive input
      const map = {
        'byog': 'BYOG',
        'no gift': 'no gift',
        'gift card': 'gift card',
        'gift': 'gift'
      };
      const lower = String(gift_option).toLowerCase();
      normalizedGift = map[lower];
      if (!normalizedGift) {
        return res.status(400).json({ error: `Invalid gift_option. Allowed: ${validGiftOptions.join(', ')}` });
      }
    }

    // If selecting a gift, require wishlist_item_id and claim it/them
    let giftClaimResult = null;
    if (normalizedGift === 'gift') {
      if (!wishlist_item_id || (Array.isArray(wishlist_item_id) && wishlist_item_id.length === 0)) {
        return res.status(400).json({ error: 'wishlist_item_id is required when gift_option is "gift"' });
      }
      const { claimWishlistItem } = require('../models/wishlistModel');
      const ids = Array.isArray(wishlist_item_id) ? wishlist_item_id : [wishlist_item_id];
      // Claim each item sequentially; could be optimized to parallel if needed
      const claims = [];
      for (const id of ids) {
        const result = await claimWishlistItem(user.id, eventId, id);
        claims.push(result);
      }
      giftClaimResult = claims;
    }

    // Respond to invitation (identify guest by session phone only)
    const updatedGuest = await respondToInvitation(eventId, null, phoneNumber, rsvpStatus);

    if (!updatedGuest) {
      return res.status(404).json({ 
        error: 'Guest not found for this event',
        details: `No guest found for phone ${phoneNumber} in event ${eventId}`
      });
    }

    res.json({ 
      success: true, 
      message: `Invitation ${rsvpStatus === 'yes' ? 'accepted' : rsvpStatus === 'no' ? 'declined' : 'marked as maybe'}`,
      guest: {
        id: updatedGuest.id,
        event_id: updatedGuest.event_id,
        guest_name: updatedGuest.guest_name,
        guest_id: updatedGuest.guest_id,
        invite_status: updatedGuest.invite_status,
        rsvp_status: updatedGuest.rsvp_status,
        responded_at: updatedGuest.responded_at
      },
      gift: normalizedGift ? { option: normalizedGift, claims: giftClaimResult } : null
    });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ error: 'Failed to respond to invitation', details: error.message });
  }
});

module.exports = router;
