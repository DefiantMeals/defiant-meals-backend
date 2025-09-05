const mongoose = require('mongoose');

const dayScheduleSchema = new mongoose.Schema({
  open: {
    type: Boolean,
    default: false
  },
  morningStart: {
    type: String,
    default: '08:00'
  },
  morningEnd: {
    type: String,
    default: '12:00'
  },
  eveningStart: {
    type: String,
    default: '16:00'
  },
  eveningEnd: {
    type: String,
    default: '20:00'
  }
});

const scheduleSchema = new mongoose.Schema({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema
}, {
  timestamps: true
});

module.exports = mongoose.model('Schedule', scheduleSchema);