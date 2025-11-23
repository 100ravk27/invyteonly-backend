// src/routes/wishlistRoutes.js
const express = require('express');
const { 
  addItemsToWishlist, 
  getUserWishlist, 
  addToUserWishlist, 
  updateUserWishlistItem, 
  deleteUserWishlistItem 
} = require('../models/wishlistModel');
const { requireAuth } = require('../middleware/authMiddleware');
const router = express.Router();

// Get user's personal wishlist (ordered by claimed/unclaimed status)
router.get('/', requireAuth, async (req, res) => {
  try {
    const wishlist = await getUserWishlist(req.userId);
    res.json({ 
      success: true, 
      wishlist,
      count: wishlist.length
    });
  } catch (error) {
    console.error('Error getting user wishlist:', error);
    res.status(500).json({ error: 'Failed to get wishlist', details: error.message });
  }
});

// Add items to user's personal wishlist
router.post('/', requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const created = await addToUserWishlist(req.userId, items);
    res.status(201).json({ 
      success: true, 
      created,
      count: created.length
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: 'Failed to add items to wishlist', details: error.message });
  }
});

// Update a wishlist item
router.put('/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { item_name, item_url } = req.body;

    if (!item_name && item_url === undefined) {
      return res.status(400).json({ error: 'At least one field (item_name or item_url) is required' });
    }

    const updated = await updateUserWishlistItem(req.userId, itemId, {
      item_name,
      item_url
    });

    if (!updated) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error updating wishlist item:', error);
    res.status(500).json({ error: 'Failed to update wishlist item', details: error.message });
  }
});

// Delete a wishlist item
router.delete('/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const deleted = await deleteUserWishlistItem(req.userId, itemId);

    if (!deleted) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    res.json({ success: true, message: 'Wishlist item deleted' });
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    res.status(500).json({ error: 'Failed to delete wishlist item', details: error.message });
  }
});

// Legacy: Add items to event wishlist (keeping for backward compatibility)
router.post('/:eventId', requireAuth, async (req, res) => {
  try {
    const created = await addItemsToWishlist(req.userId, req.params.eventId, req.body.items);
    res.json({ success: true, created });
  } catch (error) {
    console.error('Error adding items to event wishlist:', error);
    res.status(500).json({ error: 'Failed to add items to event wishlist', details: error.message });
  }
});

module.exports = router;
