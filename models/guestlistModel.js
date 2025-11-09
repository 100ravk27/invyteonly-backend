// src/models/guestlistModel.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function addGuestsToEvent(eventId, guests) {
  const created = [];
  
  for (const guest of guests) {
    // Only accept object format with name and guest_id/phone_number
    if (typeof guest !== 'object' || guest === null) {
      throw new Error('Guest must be an object with name and phone_number (or guest_id)');
    }
    
    const guestName = guest.name;
    const guestIdValue = guest.phone_number || guest.guest_id;
    
    // Validate required fields
    if (!guestName || !guestIdValue) {
      throw new Error('Guest must have both name and phone_number (or guest_id)');
    }
    
    const guestId = uuidv4();
    
    // Always set rsvp_status to 'pending' and invite_status to 'invited'
    await db('event_guests').insert({
      id: guestId,
      event_id: eventId,
      guest_id: guestIdValue, // phone_number
      guest_name: guestName, // Save guest name
      invite_status: 'invited', // Always 'invited' on creation
      rsvp_status: 'pending', // Always 'pending' on creation
      invited_at: new Date(),
      responded_at: null,
      reminder_sent_at: null,
      is_notified_host: false
    });
    
    created.push({
      id: guestId,
      name: guestName,
      phone_number: guestIdValue,
      guest_id: guestIdValue,
      invite_status: 'invited',
      rsvp_status: 'pending'
    });
  }
  
  return created;
}

async function getGuestsByEventId(eventId) {
  return db('event_guests')
    .where({ event_id: eventId })
    .orderBy('created_at', 'asc');
}

async function updateEventGuestlist(eventId, guests) {
  // Get current guests
  const currentGuests = await getGuestsByEventId(eventId);
  const currentGuestIds = new Set(currentGuests.map(g => g.guest_id).filter(Boolean));
  
  // Extract guest_ids (phone_numbers) from new guestlist (only object format)
  const newGuestIds = new Set();
  for (const guest of guests) {
    if (typeof guest !== 'object' || guest === null) {
      throw new Error('Guest must be an object with name and phone_number (or guest_id)');
    }
    
    const phoneNumber = guest.phone_number || guest.guest_id;
    if (!phoneNumber) {
      throw new Error('Guest must have phone_number or guest_id');
    }
    
    newGuestIds.add(phoneNumber);
  }
  
  // Mark guests as 'removed' if they're not in the new list (instead of deleting)
  // Note: Using 'removed' as per ENUM('invited','joined','declined','removed')
  // If your schema has 'uninvited', change 'removed' to 'uninvited'
  const guestsToUninvite = Array.from(currentGuestIds).filter(id => !newGuestIds.has(id));
  if (guestsToUninvite.length > 0) {
    await db('event_guests')
      .where({ event_id: eventId })
      .whereIn('guest_id', guestsToUninvite)
      .update({ 
        invite_status: 'removed', // Changed from 'uninvited' to 'removed' to match ENUM
        updated_at: new Date()
      });
  }
  
  // Create a map of phone_number to guest object for name updates
  const guestMap = new Map();
  for (const guest of guests) {
    const phoneNumber = guest.phone_number || guest.guest_id;
    if (phoneNumber) {
      guestMap.set(phoneNumber, guest);
    }
  }
  
  // Update existing guests (those already in the list)
  // - Update their name if provided
  // - Mark as 'invited' if they were previously 'removed'
  const existingGuestsToUpdate = Array.from(newGuestIds).filter(id => currentGuestIds.has(id));
  if (existingGuestsToUpdate.length > 0) {
    for (const phoneNumber of existingGuestsToUpdate) {
      const guest = guestMap.get(phoneNumber);
      const existingGuest = currentGuests.find(g => g.guest_id === phoneNumber);
      
      if (!existingGuest) continue;
      
      const updateData = {
        updated_at: new Date()
      };
      
      // Update guest_name if provided
      if (guest && guest.name) {
        updateData.guest_name = guest.name;
      }
      
      // Mark as 'invited' if previously 'removed'
      if (existingGuest.invite_status === 'removed') {
        updateData.invite_status = 'invited';
        updateData.invited_at = new Date();
      }
      
      // Only update if there's something to update
      if (updateData.guest_name || updateData.invite_status) {
        await db('event_guests')
          .where({ event_id: eventId, guest_id: phoneNumber })
          .update(updateData);
      }
    }
  }
  
  // Add new guests (only those not already in the list)
  const guestsToAdd = guests.filter(guest => {
    const guestId = guest.phone_number || guest.guest_id || null;
    return guestId && !currentGuestIds.has(guestId);
  });
  
  if (guestsToAdd.length > 0) {
    await addGuestsToEvent(eventId, guestsToAdd);
  }
  
  // Return updated guestlist
  return await getGuestsByEventId(eventId);
}

module.exports = { addGuestsToEvent, getGuestsByEventId, updateEventGuestlist };

