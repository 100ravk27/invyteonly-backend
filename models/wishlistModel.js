// src/models/wishlistModel.js
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Add items directly to an event's wishlist
 * @param {string} eventId - Event ID
 * @param {string} hostId - Event host ID
 * @param {Array} items - Array of items with gift_name, gift_url, gift_image_url
 */
async function addItemsToEventDirectly(eventId, hostId, items) {
  const created = [];

  for (const item of items) {
    const name = (item.gift_name || item.item_name || '').trim();
    if (!name) continue;

    const wishlistId = uuidv4();
    
    await db('wishlist').insert({
      wishlist_id: wishlistId,
      event_id: eventId,
      host_id: hostId,
      gift_name: name,
      gift_url: item.gift_url || item.item_url || null,
      gift_image_url: item.gift_image_url || null,
      claimed_by: null,
      is_claimed: 0,
      claim_status: 'pending'
    });

    created.push({ 
      wishlist_id: wishlistId,
      id: wishlistId, // For backward compatibility
      gift_name: name,
      item_name: name, // For backward compatibility
      gift_url: item.gift_url || item.item_url || null,
      item_url: item.gift_url || item.item_url || null // For backward compatibility
    });
  }

  return created;
}

/**
 * Legacy function - kept for backward compatibility
 */
async function addItemsToWishlist(userId, eventId, items) {
  // Get event to find host_id
  const event = await db('events').where({ id: eventId }).first();
  if (!event) {
    throw new Error('Event not found');
  }
  
  return await addItemsToEventDirectly(eventId, event.host_id, items);
}

/**
 * Update event wishlist (replace items)
 */
async function updateEventWishlist(userId, eventId, items) {
  // Get event to verify ownership
  const event = await db('events').where({ id: eventId, host_id: userId }).first();
  if (!event) {
    throw new Error('Event not found or you do not have permission');
  }

  // Get current wishlist items
  const currentItems = await db('wishlist')
    .where({ event_id: eventId })
    .select('wishlist_id', 'gift_name');
  
  const currentItemNames = new Set(
    currentItems.map(item => item.gift_name.toLowerCase().trim())
  );
  
  // Extract item names from new wishlist
  const newItemNames = new Set();
  for (const item of items) {
    const name = (item.gift_name || item.item_name || '').trim();
    if (name) {
      newItemNames.add(name.toLowerCase());
    }
  }
  
  // Delete items that are not in the new list
  const itemsToDelete = currentItems.filter(item => 
    !newItemNames.has(item.gift_name.toLowerCase().trim())
  );
  
  if (itemsToDelete.length > 0) {
    const itemIdsToDelete = itemsToDelete.map(item => item.wishlist_id);
    await db('wishlist')
      .where({ event_id: eventId })
      .whereIn('wishlist_id', itemIdsToDelete)
      .delete();
  }
  
  // Add new items (only those not already in the list)
  const itemsToAdd = items.filter(item => {
    const name = (item.gift_name || item.item_name || '').trim();
    if (!name) return false;
    return !currentItemNames.has(name.toLowerCase());
  });
  
  if (itemsToAdd.length > 0) {
    await addItemsToEventDirectly(eventId, event.host_id, itemsToAdd);
  }
  
  // Return updated wishlist items directly (avoiding dependency on eventModel)
  const updatedItems = await db('wishlist')
    .select(
      'wishlist_id as id',
      'gift_name as item_name',
      'gift_url as item_url',
      'gift_image_url as item_image_url',
      'is_claimed',
      'claim_status as status',
      'claimed_by',
      'claimed_at',
      'confirmed_at',
      'released_at',
      'created_at'
    )
    .where({ event_id: eventId })
    .orderBy('created_at', 'asc');

  // Format response
  return updatedItems.map(item => ({
    id: item.id,
    wishlist_id: item.id,
    item_name: item.item_name,
    gift_name: item.item_name,
    item_url: item.item_url,
    gift_url: item.item_url,
    item_image_url: item.item_image_url,
    gift_image_url: item.item_image_url,
    is_claimed: item.is_claimed === 1,
    status: item.status,
    claimed_by: item.claimed_by,
    claimed_at: item.claimed_at,
    confirmed_at: item.confirmed_at,
    released_at: item.released_at,
    created_at: item.created_at
  }));
}

/**
 * Claim a wishlist item for an event by a user
 */
async function claimWishlistItem(userId, eventId, wishlistItemId) {
  // Verify item belongs to event
  const item = await db('wishlist')
    .where({ wishlist_id: wishlistItemId, event_id: eventId })
    .first();
    
  if (!item) {
    const error = new Error('Wishlist item not found for this event');
    error.status = 404;
    throw error;
  }

  // Update item to mark as claimed
  await db('wishlist')
    .where({ wishlist_id: wishlistItemId })
    .update({
      claimed_by: userId,
      is_claimed: 1,
      claim_status: 'pending',
      claimed_at: new Date()
    });

  const updatedItem = await db('wishlist')
    .where({ wishlist_id: wishlistItemId })
    .first();

  return { 
    claim: {
      id: updatedItem.wishlist_id,
      claim_status: updatedItem.claim_status,
      claimed_at: updatedItem.claimed_at
    },
    item: {
      id: updatedItem.wishlist_id,
      wishlist_id: updatedItem.wishlist_id,
      gift_name: updatedItem.gift_name,
      item_name: updatedItem.gift_name, // For backward compatibility
      gift_url: updatedItem.gift_url,
      item_url: updatedItem.gift_url, // For backward compatibility
      is_claimed: updatedItem.is_claimed === 1,
      claim_status: updatedItem.claim_status
    }
  };
}

/**
 * Unclaim a wishlist item (release the claim)
 */
async function unclaimWishlistItem(wishlistItemId) {
  // Update item to mark as unclaimed
  await db('wishlist')
    .where({ wishlist_id: wishlistItemId })
    .update({
      claimed_by: null,
      is_claimed: 0,
      claim_status: 'pending',
      released_at: new Date()
    });

  const updatedItem = await db('wishlist')
    .where({ wishlist_id: wishlistItemId })
    .first();

  return {
    id: updatedItem.wishlist_id,
    wishlist_id: updatedItem.wishlist_id,
    gift_name: updatedItem.gift_name,
    item_name: updatedItem.gift_name,
    gift_url: updatedItem.gift_url,
    item_url: updatedItem.gift_url,
    is_claimed: updatedItem.is_claimed === 1,
    claim_status: updatedItem.claim_status
  };
}

/**
 * Get user's personal wishlist (items without event_id, where host_id = userId)
 * Orders items: unclaimed first, then claimed
 */
async function getUserWishlist(userId) {
  const wishlist = await db('wishlist')
    .where({ host_id: userId })
    .whereNull('event_id') // Personal wishlist items have no event_id
    .select(
      'wishlist_id as id',
      'gift_name as item_name',
      'gift_url as item_url',
      'gift_image_url as item_image_url',
      'is_claimed',
      'claim_status',
      'created_at',
      'updated_at'
    )
    .orderBy('created_at', 'desc');

  // For each item, check if it's been shared/claimed in any event
  const wishlistWithStatus = await Promise.all(
    wishlist.map(async (item) => {
      // Check if this item has been shared in any event and claimed
      const sharedInEvents = await db('wishlist')
        .where({ host_id: userId })
        .whereNotNull('event_id')
        .whereRaw('LOWER(gift_name) = ?', [item.item_name.toLowerCase()])
        .where('is_claimed', 1)
        .select('event_id', 'claimed_at')
        .orderBy('claimed_at', 'desc');

      const isClaimed = sharedInEvents.length > 0;
      const claimedCount = sharedInEvents.length;

      return {
        ...item,
        is_claimed: isClaimed || item.is_claimed === 1,
        claimed_count: claimedCount,
        claimed_in_events: isClaimed ? sharedInEvents.map(e => e.event_id) : []
      };
    })
  );

  // Sort: unclaimed first, then claimed (within each group by created_at desc)
  wishlistWithStatus.sort((a, b) => {
    if (a.is_claimed !== b.is_claimed) {
      return a.is_claimed ? 1 : -1; // Unclaimed first
    }
    return new Date(b.created_at) - new Date(a.created_at); // Newer first
  });

  return wishlistWithStatus;
}

/**
 * Add items to user's personal wishlist (event_id = NULL, host_id = userId)
 * Always creates new items without any duplicate checking
 */
async function addToUserWishlist(userId, items) {
  const created = [];

  for (const item of items) {
    const name = (item.gift_name || item.item_name || '').trim();
    if (!name) continue;

    // Always create new personal wishlist item (no duplicate checking)
    const wishlistId = uuidv4();
    await db('wishlist').insert({
      wishlist_id: wishlistId,
      event_id: null, // Personal wishlist item
      host_id: userId,
      gift_name: name,
      gift_url: item.gift_url || item.item_url || null,
      gift_image_url: item.gift_image_url || null,
      claimed_by: null,
      is_claimed: 0,
      claim_status: 'pending'
    });
    created.push({
      id: wishlistId,
      wishlist_id: wishlistId,
      gift_name: name,
      item_name: name, // For backward compatibility
      gift_url: item.gift_url || item.item_url || null,
      item_url: item.gift_url || item.item_url || null // For backward compatibility
    });
  }

  return created;
}

/**
 * Update a wishlist item
 */
async function updateUserWishlistItem(userId, itemId, updates) {
  // Verify item belongs to user (personal wishlist)
  const item = await db('wishlist')
    .where({ wishlist_id: itemId, host_id: userId })
    .whereNull('event_id') // Personal wishlist only
    .first();

  if (!item) {
    return null;
  }

  const updateData = {};
  if (updates.gift_name !== undefined || updates.item_name !== undefined) {
    updateData.gift_name = (updates.gift_name || updates.item_name || '').trim();
  }
  if (updates.gift_url !== undefined || updates.item_url !== undefined) {
    updateData.gift_url = updates.gift_url || updates.item_url || null;
  }
  if (updates.gift_image_url !== undefined) {
    updateData.gift_image_url = updates.gift_image_url || null;
  }
  updateData.updated_at = new Date();

  await db('wishlist')
    .where({ wishlist_id: itemId })
    .update(updateData);

  const updated = await db('wishlist')
    .where({ wishlist_id: itemId })
    .first();

  return {
    id: updated.wishlist_id,
    wishlist_id: updated.wishlist_id,
    gift_name: updated.gift_name,
    item_name: updated.gift_name, // For backward compatibility
    gift_url: updated.gift_url,
    item_url: updated.gift_url, // For backward compatibility
    gift_image_url: updated.gift_image_url,
    is_claimed: updated.is_claimed === 1,
    claim_status: updated.claim_status
  };
}

/**
 * Delete a wishlist item
 */
async function deleteUserWishlistItem(userId, itemId) {
  // Verify item belongs to user (personal wishlist)
  const item = await db('wishlist')
    .where({ wishlist_id: itemId, host_id: userId })
    .whereNull('event_id') // Personal wishlist only
    .first();

  if (!item) {
    return false;
  }

  await db('wishlist')
    .where({ wishlist_id: itemId })
    .delete();

  return true;
}

/**
 * Add items from user's personal wishlist to an event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {Array<string>} wishlistItemIds - Array of wishlist IDs from personal wishlist
 */
async function addWishlistItemsToEvent(userId, eventId, wishlistItemIds) {
  // Get event to find host_id
  const event = await db('events').where({ id: eventId }).first();
  if (!event) {
    throw new Error('Event not found');
  }

  const created = [];

  for (const wishlistItemId of wishlistItemIds) {
    // Verify item belongs to user's personal wishlist
    const personalItem = await db('wishlist')
      .where({ wishlist_id: wishlistItemId, host_id: userId })
      .whereNull('event_id') // Personal wishlist only
      .first();

    if (!personalItem) {
      continue; // Skip if item doesn't belong to user's personal wishlist
    }

    // Check if already added to this event
    const existing = await db('wishlist')
      .where({ event_id: eventId })
      .whereRaw('LOWER(gift_name) = ?', [personalItem.gift_name.toLowerCase()])
      .first();

    if (existing) {
      created.push({
        id: existing.wishlist_id,
        wishlist_id: existing.wishlist_id,
        gift_name: existing.gift_name,
        item_name: existing.gift_name, // For backward compatibility
        gift_url: existing.gift_url,
        item_url: existing.gift_url // For backward compatibility
      });
      continue;
    }

    // Add to event (create new entry in wishlist table for this event)
    const eventWishlistId = uuidv4();
    await db('wishlist').insert({
      wishlist_id: eventWishlistId,
      event_id: eventId,
      host_id: event.host_id,
      gift_name: personalItem.gift_name,
      gift_url: personalItem.gift_url,
      gift_image_url: personalItem.gift_image_url,
      claimed_by: null,
      is_claimed: 0,
      claim_status: 'pending'
    });

    created.push({
      id: eventWishlistId,
      wishlist_id: eventWishlistId,
      gift_name: personalItem.gift_name,
      item_name: personalItem.gift_name, // For backward compatibility
      gift_url: personalItem.gift_url,
      item_url: personalItem.gift_url // For backward compatibility
    });
  }

  return created;
}

module.exports = { 
  addItemsToWishlist, 
  addItemsToEventDirectly, 
  updateEventWishlist, 
  claimWishlistItem,
  unclaimWishlistItem,
  getUserWishlist,
  addToUserWishlist,
  updateUserWishlistItem,
  deleteUserWishlistItem,
  addWishlistItemsToEvent
};
