const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: [true, 'Day of the week is required']
  },
  exerciseName: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true
  },
  sets: {
    type: Number,
    required: [true, 'Number of sets is required'],
    min: [1, 'Sets must be at least 1']
  },
  reps: {
    type: String,
    required: [true, 'Reps are required'],
    trim: true
  },
  restSeconds: {
    type: Number,
    default: 60,
    min: [0, 'Rest time cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
});

const workoutPlanSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member is required'],
      unique: true
    },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trainer is required']
    },
    title: {
      type: String,
      trim: true,
      default: 'Personalized Workout Plan'
    },
    goal: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    exercises: [exerciseSchema]
  },
  {
    timestamps: true
  }
);

workoutPlanSchema.index({ trainer: 1 });

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);
