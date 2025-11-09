// src/models/eventModel.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { addGuestsToEvent, getGuestsByEventId, updateEventGuestlist } = require('./guestlistModel');
const { addItemsToWishlist, addItemsToEventDirectly, updateEventWishlist } = require('./wishlistModel');

async function createEvent(userId, eventData) {
  const eventId = uuidv4();
  
  // Build insert object with only fields that exist in the database
  const eventInsert = {
    id: eventId,
    host_id: userId,
    title: eventData.title,
    status: 'live',
    invite_link: uuidv4()
  };
  
  // Add optional fields if they exist in the request
  if (eventData.description !== undefined) eventInsert.description = eventData.description;
  if (eventData.event_date !== undefined) eventInsert.event_date = eventData.event_date;
  if (eventData.venue !== undefined) eventInsert.venue = eventData.venue;
  if (eventData.theme !== undefined) eventInsert.theme = eventData.theme;
  
  await db('events').insert(eventInsert);
  
  const event = await db('events').where({ id: eventId }).first();
  
  // Add guestlist if provided
  let guestlist = [];
  if (eventData.guestlist && Array.isArray(eventData.guestlist) && eventData.guestlist.length > 0) {
    guestlist = await addGuestsToEvent(eventId, eventData.guestlist);
  }
  
  // Add wishlist items if provided (directly to event_wishlist_items, no wishlist_master)
  let wishlist_items = [];
  if (eventData.wishlist_items && Array.isArray(eventData.wishlist_items) && eventData.wishlist_items.length > 0) {
    wishlist_items = await addItemsToEventDirectly(eventId, eventData.wishlist_items);
  }
  
  return { ...event, guestlist, wishlist_items };
}

async function getWishlistItemsByEventId(eventId) {
  return db('event_wishlist_items')
    .select('id', 'item_name', 'item_url')
    .where({ event_id: eventId })
    .orderBy('created_at', 'asc');
}

async function getEventById(id) {
  const event = await db('events').where({ id }).first();
  if (!event) return null;
  
  // Get guestlist for the event
  const guestlist = await getGuestsByEventId(id);
  
  // Get wishlist items for the event
  const wishlist_items = await getWishlistItemsByEventId(id);
  
  return { ...event, guestlist, wishlist_items };
}

async function getAllEvents(userId = null) {
  let query = db('events');
  
  // If userId is provided, filter by host_id
  if (userId) {
    query = query.where({ host_id: userId });
  }
  
  const events = await query.orderBy('created_at', 'desc');
  
  // Get guestlist and wishlist items for each event
  const eventsWithDetails = await Promise.all(
    events.map(async (event) => {
      const guestlist = await getGuestsByEventId(event.id);
      const wishlist_items = await getWishlistItemsByEventId(event.id);
      return { ...event, guestlist, wishlist_items };
    })
  );
  
  return eventsWithDetails;
}

async function updateEvent(eventId, userId, eventData) {
  // Verify event exists and belongs to user
  const event = await db('events').where({ id: eventId, host_id: userId }).first();
  if (!event) {
    return null;
  }
  
  // Build update object
  const eventUpdate = {};
  if (eventData.title !== undefined) eventUpdate.title = eventData.title;
  if (eventData.description !== undefined) eventUpdate.description = eventData.description;
  if (eventData.event_date !== undefined) eventUpdate.event_date = eventData.event_date;
  if (eventData.venue !== undefined) eventUpdate.venue = eventData.venue;
  if (eventData.theme !== undefined) eventUpdate.theme = eventData.theme;
  if (eventData.status !== undefined) eventUpdate.status = eventData.status;
  
  // Update event fields if any
  if (Object.keys(eventUpdate).length > 0) {
    await db('events').where({ id: eventId }).update(eventUpdate);
  }
  
  // Update guestlist if provided
  let guestlist = null;
  if (eventData.guestlist !== undefined) {
    if (Array.isArray(eventData.guestlist)) {
      if (eventData.guestlist.length === 0) {
        // Empty array means delete all guests
        await db('event_guests').where({ event_id: eventId }).delete();
        guestlist = [];
      } else {
        // Replace guestlist
        guestlist = await updateEventGuestlist(eventId, eventData.guestlist);
      }
    }
  }
  
  // Update wishlist if provided
  let wishlist_items = null;
  if (eventData.wishlist_items !== undefined) {
    if (Array.isArray(eventData.wishlist_items)) {
      if (eventData.wishlist_items.length === 0) {
        // Empty array means delete all wishlist items
        await db('event_wishlist_items').where({ event_id: eventId }).delete();
        wishlist_items = [];
      } else {
        // Replace wishlist
        wishlist_items = await updateEventWishlist(userId, eventId, eventData.wishlist_items);
      }
    }
  }
  
  // Get updated event
  const updatedEvent = await db('events').where({ id: eventId }).first();
  
  // Get guestlist and wishlist if not already updated
  if (guestlist === null) {
    guestlist = await getGuestsByEventId(eventId);
  }
  if (wishlist_items === null) {
    wishlist_items = await getWishlistItemsByEventId(eventId);
  }
  
  return { ...updatedEvent, guestlist, wishlist_items };
}

module.exports = { createEvent, getEventById, getAllEvents, updateEvent };
