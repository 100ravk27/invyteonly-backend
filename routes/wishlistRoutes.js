// src/routes/wishlistRoutes.js
const express = require('express');
const { addItemsToWishlist } = require('../models/wishlistModel');
const { requireAuth } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/:eventId', requireAuth, async (req, res) => {
  const created = await addItemsToWishlist(req.userId, req.params.eventId, req.body.items);
  res.json({ success: true, created });
});

module.exports = router;
