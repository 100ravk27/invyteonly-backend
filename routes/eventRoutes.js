// src/routes/eventRoutes.js
const express = require('express');
const db = require('../config/db');
const { createEvent, saveEventDraft, getEventById, getAllEvents, updateEvent, deleteEvent, getEventsByHostId, getEventsByGuestPhone, hydrateEvents } = require('../models/eventModel');
const { getUserById } = require('../models/userModel');
const { respondToInvitation, getRsvpStatus } = require('../models/guestlistModel');
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

// Save event as draft (can create new or update existing draft)
router.post('/draft', requireAuth, async (req, res) => {
  try {
    const draft = await saveEventDraft(req.userId, req.body);
    res.status(200).json({ success: true, event: draft, message: 'Draft saved successfully' });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft', details: error.message });
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

// Delete event
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteEvent(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found or you do not have permission to delete it' });
    }
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event', details: error.message });
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

    // If changing from gift to non-gift option, unclaim previous items
    if (normalizedGift !== 'gift' && normalizedGift !== null && normalizedGift !== undefined) {
      const currentGuest = await db('event_guests')
        .where({ event_id: eventId, guest_id: phoneNumber })
        .first();
      
      if (currentGuest && currentGuest.wishlist_id) {
        const { unclaimWishlistItem } = require('../models/wishlistModel');
        try {
          await unclaimWishlistItem(currentGuest.wishlist_id);
          console.log(`✅ Unclaimed wishlist item as gift_option changed to: ${normalizedGift}`);
        } catch (error) {
          console.error('Error unclaiming item:', error);
        }
      }
    }

    // If selecting a gift, require wishlist_item_id and claim it/them
    let giftClaimResult = null;
    let firstWishlistId = null;
    if (normalizedGift === 'gift') {
      if (!wishlist_item_id || (Array.isArray(wishlist_item_id) && wishlist_item_id.length === 0)) {
        return res.status(400).json({ error: 'wishlist_item_id is required when gift_option is "gift"' });
      }
      
      // Get current guest record to check for previously claimed item
      const currentGuest = await db('event_guests')
        .where({ event_id: eventId, guest_id: phoneNumber })
        .first();
      
      // If guest previously claimed a different item, unclaim it
      if (currentGuest && currentGuest.wishlist_id) {
        const { unclaimWishlistItem } = require('../models/wishlistModel');
        const previousItemId = currentGuest.wishlist_id;
        const newItemIds = Array.isArray(wishlist_item_id) ? wishlist_item_id : [wishlist_item_id];
        
        // Only unclaim if the new item(s) are different from the old one
        if (!newItemIds.includes(previousItemId)) {
          try {
            await unclaimWishlistItem(previousItemId);
            console.log(`✅ Unclaimed previous wishlist item: ${previousItemId}`);
          } catch (error) {
            console.error('Error unclaiming previous item:', error);
            // Continue anyway - don't fail the whole request
          }
        }
      }
      
      const { claimWishlistItem } = require('../models/wishlistModel');
      const ids = Array.isArray(wishlist_item_id) ? wishlist_item_id : [wishlist_item_id];
      // Claim each item sequentially
      const claims = [];
      for (const id of ids) {
        const result = await claimWishlistItem(user.id, eventId, id);
        claims.push(result);
        // Store first wishlist_id for event_guests table
        if (!firstWishlistId && result.item && result.item.wishlist_id) {
          firstWishlistId = result.item.wishlist_id;
        } else if (!firstWishlistId && result.item && result.item.id) {
          firstWishlistId = result.item.id;
        }
      }
      giftClaimResult = claims;
    }

    // Respond to invitation (identify guest by session phone only)
    // Pass gift_option and wishlist_id to save in event_guests table
    const updatedGuest = await respondToInvitation(eventId, null, phoneNumber, rsvpStatus, normalizedGift, firstWishlistId);

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
        gift_option: updatedGuest.gift_option,
        wishlist_id: updatedGuest.wishlist_id,
        responded_at: updatedGuest.responded_at
      },
      gift: normalizedGift ? { option: normalizedGift, claims: giftClaimResult } : null
    });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ error: 'Failed to respond to invitation', details: error.message });
  }
});

// Get RSVP status and gift option for the logged-in user
// GET /events/:eventId/rsvp-status
router.get('/:eventId/rsvp-status', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get current user and phone
    const user = await getUserById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const phoneNumber = user.phone_number;

    // Get RSVP status and gift information
    const rsvpInfo = await getRsvpStatus(eventId, phoneNumber);

    if (!rsvpInfo) {
      return res.status(404).json({ 
        error: 'Guest not found for this event',
        details: `No guest found for phone ${phoneNumber} in event ${eventId}`
      });
    }

    res.json({
      success: true,
      event_id: eventId,
      status: rsvpInfo.rsvp_status,
      invite_status: rsvpInfo.invite_status,
      gift_option: rsvpInfo.gift_option,
      wishlist_id: rsvpInfo.wishlist_id,
      gift_claims: rsvpInfo.gift_claims,
      responded_at: rsvpInfo.responded_at
    });
  } catch (error) {
    console.error('Error getting RSVP status:', error);
    res.status(500).json({ error: 'Failed to get RSVP status', details: error.message });
  }
});

module.exports = router;
