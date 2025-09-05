const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// Get current schedule
router.get('/', async (req, res) => {
  try {
    let schedule = await Schedule.findOne();
    
    // If no schedule exists, create default one
    if (!schedule) {
      schedule = new Schedule({
        monday: { open: false, morningStart: '08:00', morningEnd: '12:00', eveningStart: '16:00', eveningEnd: '20:00' },
        tuesday: { open: false, morningStart: '08:00', morningEnd: '12:00', eveningStart: '16:00', eveningEnd: '20:00' },
        wednesday: { open: false, morningStart: '08:00', morningEnd: '12:00', eveningStart: '16:00', eveningEnd: '20:00' },
        thursday: { open: false, morningStart: '08:00', morningEnd: '12:00', eveningStart: '16:00', eveningEnd: '20:00' },
        friday: { open: false, morningStart: '08:00', morningEnd: '12:00', eveningStart: '16:00', eveningEnd: '20:00' },
        saturday: { open: false, morningStart: '08:00', morningEnd: '12:00', eveningStart: '16:00', eveningEnd: '20:00' },
        sunday: { open: false, morningStart: '08:00', morningEnd: '12:00', eveningStart: '16:00', eveningEnd: '20:00' }
      });
      await schedule.save();
    }
    
    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Failed to fetch schedule' });
  }
});

// Update schedule
router.put('/', async (req, res) => {
  try {
    let schedule = await Schedule.findOne();
    
    if (!schedule) {
      // Create new schedule if none exists
      schedule = new Schedule(req.body);
    } else {
      // Update existing schedule
      schedule.monday = req.body.monday || schedule.monday;
      schedule.tuesday = req.body.tuesday || schedule.tuesday;
      schedule.wednesday = req.body.wednesday || schedule.wednesday;
      schedule.thursday = req.body.thursday || schedule.thursday;
      schedule.friday = req.body.friday || schedule.friday;
      schedule.saturday = req.body.saturday || schedule.saturday;
      schedule.sunday = req.body.sunday || schedule.sunday;
    }
    
    await schedule.save();
    res.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Failed to update schedule' });
  }
});

module.exports = router;