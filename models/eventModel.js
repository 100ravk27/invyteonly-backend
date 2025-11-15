// src/models/eventModel.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { addGuestsToEvent, getGuestsByEventId, updateEventGuestlist } = require('./guestlistModel');
const { addItemsToWishlist, addItemsToEventDirectly, updateEventWishlist } = require('./wishlistModel');

/**
 * Convert date to MySQL DATETIME format preserving exact time as provided
 * Saves event_date exactly as provided in request (no timezone conversion)
 * @param {string|number|Date} dateValue - Date in any format
 * @returns {string|null} - MySQL DATETIME string (YYYY-MM-DD HH:MM:SS) or original if already MySQL format
 */
function toMySQLDateTime(dateValue) {
  if (!dateValue) return dateValue;
  
  // If it's already a MySQL DATETIME format string, return as-is
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$/.test(dateValue)) {
    return dateValue;
  }
  
  let date;
  
  // If it's a number (timestamp)
  if (typeof dateValue === 'number') {
    // If timestamp is in seconds (less than year 2001 in milliseconds), convert to milliseconds
    if (dateValue < 10000000000) {
      date = new Date(dateValue * 1000);
    } else {
      date = new Date(dateValue);
    }
  }
  // If it's a Date object
  else if (dateValue instanceof Date) {
    date = dateValue;
  }
  // If it's a string (ISO format, etc.)
  else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  }
  // Fallback
  else {
    date = new Date(dateValue);
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return dateValue; // Return original if invalid
  }
  
  // Extract components from the date as-is (preserving the exact time provided)
  // For ISO strings like "2025-11-18T4:29:18.000Z", extract the time components directly
  // This ensures "2025-11-18T4:29:18.000Z" saves as "2025-11-18 04:29:18" (preserving 04:29:18)
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Convert MySQL DATETIME to ISO format (treating stored time as provided, no conversion)
 * This ensures "2025-11-18 04:29:18" returns as "2025-11-18T04:29:18.000Z"
 * @param {string|Date} dateValue - MySQL DATETIME string or Date object
 * @returns {string|null} - ISO format string or original value
 */
function fromMySQLDateTime(dateValue) {
  if (!dateValue) return dateValue;
  
  // If it's already an ISO string, return as-is
  if (typeof dateValue === 'string' && dateValue.includes('T') && dateValue.includes('Z')) {
    return dateValue;
  }
  
  let date;
  
  // If it's a Date object
  if (dateValue instanceof Date) {
    date = dateValue;
  }
  // If it's a MySQL DATETIME string (YYYY-MM-DD HH:MM:SS)
  else if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$/.test(dateValue)) {
    // Parse MySQL DATETIME and treat the stored time as-is (no timezone conversion)
    const [datePart, timePart] = dateValue.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = (timePart || '00:00:00').split(':').map(Number);
    
    // Create UTC date with the exact time components (preserving the stored time)
    date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  }
  // Fallback
  else {
    date = new Date(dateValue);
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return dateValue; // Return original if invalid
  }
  
  // Format as ISO string with UTC timezone (preserving the exact time)
  return date.toISOString();
}

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
  // Save event_date exactly as provided (no timezone conversion)
  if (eventData.event_date !== undefined) {
    const dateStr = toMySQLDateTime(eventData.event_date);
    // Use CAST to ensure MySQL treats the date string as-is without timezone conversion
    eventInsert.event_date = db.raw(`CAST(? AS DATETIME)`, [dateStr]);
  }
  if (eventData.venue !== undefined) eventInsert.venue = eventData.venue;
  if (eventData.theme !== undefined) eventInsert.theme = eventData.theme;
  
  await db('events').insert(eventInsert);
  
  // Read event_date as raw string to avoid timezone conversion
  const event = await db('events')
    .select('*', db.raw('DATE_FORMAT(event_date, "%Y-%m-%d %H:%i:%s") as event_date_raw'))
    .where({ id: eventId })
    .first();
  
  // Use raw date string if available, otherwise use the date object
  if (event) {
    if (event.event_date_raw) {
      event.event_date = fromMySQLDateTime(event.event_date_raw);
    } else if (event.event_date) {
      event.event_date = fromMySQLDateTime(event.event_date);
    }
  }
  
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
  // Read event_date as raw string to avoid timezone conversion
  const event = await db('events')
    .select('*', db.raw('DATE_FORMAT(event_date, "%Y-%m-%d %H:%i:%s") as event_date_raw'))
    .where({ id })
    .first();
  
  if (!event) return null;
  
  // Convert event_date back to ISO format for response
  if (event.event_date_raw) {
    event.event_date = fromMySQLDateTime(event.event_date_raw);
    delete event.event_date_raw; // Clean up temporary field
  } else if (event.event_date) {
    event.event_date = fromMySQLDateTime(event.event_date);
  }
  
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
  
  // Read event_date as raw string to avoid timezone conversion
  const events = await query
    .select('*', db.raw('DATE_FORMAT(event_date, "%Y-%m-%d %H:%i:%s") as event_date_raw'))
    .orderBy('created_at', 'desc');
  
  // Get guestlist and wishlist items for each event
  const eventsWithDetails = await Promise.all(
    events.map(async (event) => {
      // Convert event_date back to ISO format for response
      if (event.event_date_raw) {
        event.event_date = fromMySQLDateTime(event.event_date_raw);
        delete event.event_date_raw; // Clean up temporary field
      } else if (event.event_date) {
        event.event_date = fromMySQLDateTime(event.event_date);
      }
      
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
  // Save event_date exactly as provided (no timezone conversion)
  if (eventData.event_date !== undefined) {
    const dateStr = toMySQLDateTime(eventData.event_date);
    // Use CAST to ensure MySQL treats the date string as-is without timezone conversion
    eventUpdate.event_date = db.raw(`CAST(? AS DATETIME)`, [dateStr]);
  }
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
  
  // Read event_date as raw string to avoid timezone conversion
  const updatedEvent = await db('events')
    .select('*', db.raw('DATE_FORMAT(event_date, "%Y-%m-%d %H:%i:%s") as event_date_raw'))
    .where({ id: eventId })
    .first();
  
  // Convert event_date back to ISO format for response
  if (updatedEvent) {
    if (updatedEvent.event_date_raw) {
      updatedEvent.event_date = fromMySQLDateTime(updatedEvent.event_date_raw);
      delete updatedEvent.event_date_raw; // Clean up temporary field
    } else if (updatedEvent.event_date) {
      updatedEvent.event_date = fromMySQLDateTime(updatedEvent.event_date);
    }
  }
  
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
