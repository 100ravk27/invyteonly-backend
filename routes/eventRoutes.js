// src/routes/eventRoutes.js
const express = require('express');
const { createEvent, getEventById, getAllEvents, updateEvent } = require('../models/eventModel');
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

// Get all events (filtered by logged-in user's events)
router.get('/', requireAuth, async (req, res) => {
  try {
    const events = await getAllEvents(req.userId);
    res.json({ success: true, events, count: events.length });
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

module.exports = router;
