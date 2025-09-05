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
        monday: { open: false, timeSlots: [] },
        tuesday: { open: false, timeSlots: [] },
        wednesday: { open: false, timeSlots: [] },
        thursday: { open: false, timeSlots: [] },
        friday: { open: false, timeSlots: [] },
        saturday: { open: false, timeSlots: [] },
        sunday: { open: false, timeSlots: [] }
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