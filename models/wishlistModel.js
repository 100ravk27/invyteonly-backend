// src/models/wishlistModel.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Add items directly to event_wishlist_items (no wishlist_master)
async function addItemsToEventDirectly(eventId, items) {
  const created = [];

  for (const item of items) {
    const name = item.item_name.trim();
    if (!name) continue;

    const eventItemId = uuidv4();
    const itemUrl = item.item_url || null;
    
    await db('event_wishlist_items').insert({
      id: eventItemId,
      event_id: eventId,
      wishlist_item_id: null, // No master reference
      item_name: name,
      item_url: itemUrl
    });

    created.push({ 
      id: eventItemId, 
      item_name: name,
      item_url: itemUrl
    });
  }

  return created;
}

async function addItemsToWishlist(userId, eventId, items) {
  const created = [];

  for (const item of items) {
    const name = item.item_name.trim();
    if (!name) continue;

    // dedupe by name/url
    const existing = await db('wishlist_master')
      .whereRaw('LOWER(item_name) = ?', [name.toLowerCase()])
      .andWhere({ user_id: userId })
      .first();

    let masterId;
    if (existing) {
      masterId = existing.id;
    } else {
      masterId = uuidv4();
      await db('wishlist_master').insert({
        id: masterId,
        user_id: userId,
        item_name: name,
        item_url: item.item_url || null,
      });
    }

    const eventItemId = uuidv4();
    const itemUrl = item.item_url || null;
    
    await db('event_wishlist_items').insert({
      id: eventItemId,
      event_id: eventId,
      wishlist_item_id: masterId,
      item_name: name,
      item_url: itemUrl
    });

    created.push({ 
      id: eventItemId, 
      item_name: name,
      item_url: itemUrl
    });
  }

  return created;
}

async function updateEventWishlist(userId, eventId, items) {
  // Get current wishlist items
  const currentItems = await db('event_wishlist_items')
    .where({ event_id: eventId })
    .select('id', 'item_name');
  
  const currentItemNames = new Set(
    currentItems.map(item => item.item_name.toLowerCase().trim())
  );
  
  // Extract item names from new wishlist
  const newItemNames = new Set();
  for (const item of items) {
    if (item.item_name) {
      newItemNames.add(item.item_name.toLowerCase().trim());
    }
  }
  
  // Delete items that are not in the new list
  const itemsToDelete = currentItems.filter(item => 
    !newItemNames.has(item.item_name.toLowerCase().trim())
  );
  
  if (itemsToDelete.length > 0) {
    const itemIdsToDelete = itemsToDelete.map(item => item.id);
    await db('event_wishlist_items')
      .where({ event_id: eventId })
      .whereIn('id', itemIdsToDelete)
      .delete();
  }
  
  // Add new items (only those not already in the list)
  const itemsToAdd = items.filter(item => {
    if (!item.item_name) return false;
    const itemName = item.item_name.toLowerCase().trim();
    return !currentItemNames.has(itemName);
  });
  
  if (itemsToAdd.length > 0) {
    await addItemsToEventDirectly(eventId, itemsToAdd);
  }
  
  // Return updated wishlist
  return await db('event_wishlist_items')
    .select('id', 'item_name', 'item_url')
    .where({ event_id: eventId })
    .orderBy('created_at', 'asc');
}

module.exports = { addItemsToWishlist, addItemsToEventDirectly, updateEventWishlist };
