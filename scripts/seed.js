require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');
const Membership = require('../models/Membership');
const WorkoutPlan = require('../models/WorkoutPlan');
const Attendance = require('../models/Attendance');
const WeightLog = require('../models/WeightLog');
const { calculateExpiryDate, getMembershipStatus } = require('../utils/membershipUtils');
const { normalizeDate, addDays } = require('../utils/dateUtils');

const seedDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gymflow';
    await mongoose.connect(mongoURI);
    console.log(`[Seed] Connected to MongoDB at ${mongoURI}`);

    // Clean existing data
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      MembershipPlan.deleteMany({}),
      Membership.deleteMany({}),
      WorkoutPlan.deleteMany({}),
      Attendance.deleteMany({}),
      WeightLog.deleteMany({})
    ]);

    // 1. Create Membership Plans
    console.log('[Seed] Creating Membership Plans...');
    const plansData = [
      {
        name: 'Monthly Plan',
        durationDays: 30,
        price: 1500,
        description: '30-day all-access gym pass with free locker and shower access.',
        isActive: true
      },
      {
        name: 'Quarterly Plan',
        durationDays: 90,
        price: 4000,
        description: '90-day access including 1 free consultation with a certified trainer.',
        isActive: true
      },
      {
        name: 'Half-Yearly Plan',
        durationDays: 180,
        price: 7500,
        description: '180-day membership with body composition assessment and sauna access.',
        isActive: true
      },
      {
        name: 'Annual Plan',
        durationDays: 365,
        price: 12000,
        description: 'Full 365-day VIP access with unlimited guest passes and customized routines.',
        isActive: true
      }
    ];

    const plans = await MembershipPlan.insertMany(plansData);
    const [monthlyPlan, quarterlyPlan, halfYearlyPlan, annualPlan] = plans;

    // 2. Create Admin Account
    console.log('[Seed] Creating Admin account...');
    const adminPassword = await bcrypt.hash('Admin@123', 10);
    const [admin] = await User.insertMany([
      {
        name: 'Gym Administrator',
        email: 'admin@gymflow.com',
        password: adminPassword,
        phone: '+91 98765 00001',
        role: 'admin',
        gender: 'prefer_not_to_say',
        isActive: true
      }
    ]);

    // 3. Create Trainers
    console.log('[Seed] Creating Trainers...');
    const trainerPassword = await bcrypt.hash('Trainer@123', 10);
    const trainersData = [
      {
        name: 'Marcus Vance',
        email: 'marcus.trainer@gymflow.com',
        password: trainerPassword,
        phone: '+91 98765 11111',
        role: 'trainer',
        specialization: 'Strength Training',
        gender: 'male',
        isActive: true
      },
      {
        name: 'Sarah Connor',
        email: 'sarah.trainer@gymflow.com',
        password: trainerPassword,
        phone: '+91 98765 22222',
        role: 'trainer',
        specialization: 'Weight Loss',
        gender: 'female',
        isActive: true
      },
      {
        name: 'Alex Rivera',
        email: 'alex.trainer@gymflow.com',
        password: trainerPassword,
        phone: '+91 98765 33333',
        role: 'trainer',
        specialization: 'Functional Training',
        gender: 'male',
        isActive: true
      }
    ];

    const trainers = await User.insertMany(trainersData);
    const [marcus, sarah, alex] = trainers;

    // 4. Create 10 Members
    console.log('[Seed] Creating 10 Members...');
    const memberPassword = await bcrypt.hash('Member@123', 10);
    const membersData = [
      {
        name: 'Robert Chen',
        email: 'robert.chen@example.com',
        password: memberPassword,
        phone: '+91 98111 00001',
        role: 'member',
        gender: 'male',
        dateOfBirth: new Date('1994-04-12'),
        trainer: marcus._id,
        isActive: true
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@example.com',
        password: memberPassword,
        phone: '+91 98111 00002',
        role: 'member',
        gender: 'female',
        dateOfBirth: new Date('1998-09-23'),
        trainer: sarah._id,
        isActive: true
      },
      {
        name: 'David Miller',
        email: 'david.miller@example.com',
        password: memberPassword,
        phone: '+91 98111 00003',
        role: 'member',
        gender: 'male',
        dateOfBirth: new Date('1991-01-15'),
        trainer: alex._id,
        isActive: true
      },
      {
        name: 'Jessica Taylor',
        email: 'jessica.taylor@example.com',
        password: memberPassword,
        phone: '+91 98111 00004',
        role: 'member',
        gender: 'female',
        dateOfBirth: new Date('1996-07-08'),
        trainer: marcus._id,
        isActive: true
      },
      {
        name: 'Michael Wilson',
        email: 'michael.wilson@example.com',
        password: memberPassword,
        phone: '+91 98111 00005',
        role: 'member',
        gender: 'male',
        dateOfBirth: new Date('1988-11-30'),
        trainer: sarah._id,
        isActive: true
      },
      {
        name: 'Sophia Anderson',
        email: 'sophia.anderson@example.com',
        password: memberPassword,
        phone: '+91 98111 00006',
        role: 'member',
        gender: 'female',
        dateOfBirth: new Date('2000-03-19'),
        trainer: alex._id,
        isActive: true
      },
      {
        name: 'James Thomas',
        email: 'james.thomas@example.com',
        password: memberPassword,
        phone: '+91 98111 00007',
        role: 'member',
        gender: 'male',
        dateOfBirth: new Date('1995-12-05'),
        trainer: marcus._id,
        isActive: true
      },
      {
        name: 'Olivia Martinez',
        email: 'olivia.martinez@example.com',
        password: memberPassword,
        phone: '+91 98111 00008',
        role: 'member',
        gender: 'female',
        dateOfBirth: new Date('1993-06-27'),
        trainer: sarah._id,
        isActive: true
      },
      {
        name: 'Daniel White',
        email: 'daniel.white@example.com',
        password: memberPassword,
        phone: '+91 98111 00009',
        role: 'member',
        gender: 'male',
        dateOfBirth: new Date('1989-08-14'),
        trainer: alex._id,
        isActive: true
      },
      {
        name: 'Ava Jackson',
        email: 'ava.jackson@example.com',
        password: memberPassword,
        phone: '+91 98111 00010',
        role: 'member',
        gender: 'female',
        dateOfBirth: new Date('1997-10-10'),
        trainer: marcus._id,
        isActive: true
      }
    ];

    const members = await User.insertMany(membersData);

    // 5. Create Memberships (Active, Expiring Soon, Expired)
    console.log('[Seed] Assigning memberships (active, expiring soon, expired)...');
    const now = new Date();

    const membershipsData = [
      // 1. Robert Chen: Active Annual Plan (started 30 days ago, ~335 days left)
      {
        member: members[0]._id,
        plan: annualPlan._id,
        startDate: addDays(now, -30),
        expiryDate: addDays(now, 335),
        status: 'active',
        amountPaid: annualPlan.price
      },
      // 2. Emily Davis: Active Quarterly Plan (started 15 days ago, ~75 days left)
      {
        member: members[1]._id,
        plan: quarterlyPlan._id,
        startDate: addDays(now, -15),
        expiryDate: addDays(now, 75),
        status: 'active',
        amountPaid: quarterlyPlan.price
      },
      // 3. David Miller: Active Monthly Plan (started 10 days ago, ~20 days left)
      {
        member: members[2]._id,
        plan: monthlyPlan._id,
        startDate: addDays(now, -10),
        expiryDate: addDays(now, 20),
        status: 'active',
        amountPaid: monthlyPlan.price
      },
      // 4. Jessica Taylor: Expiring Soon Monthly Plan (started 27 days ago, 3 days left!)
      {
        member: members[3]._id,
        plan: monthlyPlan._id,
        startDate: addDays(now, -27),
        expiryDate: addDays(now, 3),
        status: 'active',
        amountPaid: monthlyPlan.price
      },
      // 5. Michael Wilson: Expiring Soon Quarterly Plan (started 86 days ago, 4 days left!)
      {
        member: members[4]._id,
        plan: quarterlyPlan._id,
        startDate: addDays(now, -86),
        expiryDate: addDays(now, 4),
        status: 'active',
        amountPaid: quarterlyPlan.price
      },
      // 6. Sophia Anderson: Active Half-Yearly Plan (started 40 days ago, ~140 days left)
      {
        member: members[5]._id,
        plan: halfYearlyPlan._id,
        startDate: addDays(now, -40),
        expiryDate: addDays(now, 140),
        status: 'active',
        amountPaid: halfYearlyPlan.price
      },
      // 7. James Thomas: Expired Monthly Plan (expired 5 days ago)
      {
        member: members[6]._id,
        plan: monthlyPlan._id,
        startDate: addDays(now, -35),
        expiryDate: addDays(now, -5),
        status: 'expired',
        amountPaid: monthlyPlan.price
      },
      // 8. Olivia Martinez: Expired Quarterly Plan (expired 12 days ago)
      {
        member: members[7]._id,
        plan: quarterlyPlan._id,
        startDate: addDays(now, -102),
        expiryDate: addDays(now, -12),
        status: 'expired',
        amountPaid: quarterlyPlan.price
      },
      // 9. Daniel White: Active Monthly Plan (started 5 days ago, ~25 days left)
      {
        member: members[8]._id,
        plan: monthlyPlan._id,
        startDate: addDays(now, -5),
        expiryDate: addDays(now, 25),
        status: 'active',
        amountPaid: monthlyPlan.price
      },
      // 10. Ava Jackson: Active Annual Plan (started 60 days ago, ~305 days left)
      {
        member: members[9]._id,
        plan: annualPlan._id,
        startDate: addDays(now, -60),
        expiryDate: addDays(now, 305),
        status: 'active',
        amountPaid: annualPlan.price
      }
    ];

    await Membership.insertMany(membershipsData);

    // 6. Create Workout Plans
    console.log('[Seed] Creating Workout Plans...');
    const workoutPlansData = [
      // Robert Chen (Marcus)
      {
        member: members[0]._id,
        trainer: marcus._id,
        title: 'Hypertrophy & Strength Split',
        goal: 'Muscle Growth and Heavy Compound Strength',
        notes: 'Maintain strict form on compound lifts. Rest 90 seconds on main sets.',
        exercises: [
          { dayOfWeek: 'Monday', exerciseName: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 90, notes: 'Controlled eccentric, pause at chest' },
          { dayOfWeek: 'Monday', exerciseName: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 60, notes: '30-degree incline' },
          { dayOfWeek: 'Monday', exerciseName: 'Cable Tricep Pushdown', sets: 3, reps: '12-15', restSeconds: 45, notes: 'Squeeze triceps at lockout' },
          { dayOfWeek: 'Wednesday', exerciseName: 'Barbell Back Squat', sets: 4, reps: '6-8', restSeconds: 120, notes: 'Depth below parallel' },
          { dayOfWeek: 'Wednesday', exerciseName: 'Romanian Deadlift', sets: 3, reps: '8-10', restSeconds: 90, notes: 'Feel hamstring stretch' },
          { dayOfWeek: 'Wednesday', exerciseName: 'Standing Calf Raise', sets: 4, reps: '15', restSeconds: 45, notes: '2 second hold at the top' },
          { dayOfWeek: 'Friday', exerciseName: 'Barbell Overhead Press', sets: 4, reps: '8', restSeconds: 90, notes: 'Tight core and glutes' },
          { dayOfWeek: 'Friday', exerciseName: 'Lat Pulldown', sets: 3, reps: '10-12', restSeconds: 60, notes: 'Drive elbows down' },
          { dayOfWeek: 'Friday', exerciseName: 'Dumbbell Lateral Raise', sets: 4, reps: '15', restSeconds: 45, notes: 'Slow and controlled' }
        ]
      },
      // Emily Davis (Sarah)
      {
        member: members[1]._id,
        trainer: sarah._id,
        title: 'Metabolic Conditioning & Toning',
        goal: 'Fat Loss and Lean Muscle Definition',
        notes: 'Keep rest intervals short. Drink plenty of water throughout the workout.',
        exercises: [
          { dayOfWeek: 'Monday', exerciseName: 'Goblet Squat', sets: 4, reps: '12-15', restSeconds: 45, notes: 'Keep chest high' },
          { dayOfWeek: 'Monday', exerciseName: 'Push-Ups (or Knee)', sets: 3, reps: '10-12', restSeconds: 45, notes: 'Full range of motion' },
          { dayOfWeek: 'Monday', exerciseName: 'Mountain Climbers', sets: 3, reps: '30 secs', restSeconds: 30, notes: 'Steady pace' },
          { dayOfWeek: 'Tuesday', exerciseName: 'Dumbbell Lunges', sets: 3, reps: '12 each leg', restSeconds: 45, notes: '90-degree knee bend' },
          { dayOfWeek: 'Tuesday', exerciseName: 'Dumbbell Row', sets: 3, reps: '12', restSeconds: 45, notes: 'Pull towards hip' },
          { dayOfWeek: 'Thursday', exerciseName: 'Kettlebell Swings', sets: 4, reps: '15-20', restSeconds: 45, notes: 'Hinge at the hips' },
          { dayOfWeek: 'Thursday', exerciseName: 'Plank Hold', sets: 3, reps: '45 secs', restSeconds: 30, notes: 'Maintain neutral spine' },
          { dayOfWeek: 'Saturday', exerciseName: 'Treadmill Interval Sprints', sets: 8, reps: '30s sprint / 60s walk', restSeconds: 60, notes: 'Cardio finisher' }
        ]
      },
      // David Miller (Alex)
      {
        member: members[2]._id,
        trainer: alex._id,
        title: 'Functional Mobility & Athletic Power',
        goal: 'Core Stability and Joint Mobility',
        notes: 'Prioritize movement quality over weight.',
        exercises: [
          { dayOfWeek: 'Monday', exerciseName: 'Trap Bar Deadlift', sets: 4, reps: '8', restSeconds: 90, notes: 'Drive through heels' },
          { dayOfWeek: 'Monday', exerciseName: 'Pull-Ups / Assisted', sets: 3, reps: '8-10', restSeconds: 60, notes: 'Chest to bar' },
          { dayOfWeek: 'Wednesday', exerciseName: 'Bulgarian Split Squats', sets: 3, reps: '10 each leg', restSeconds: 60, notes: 'Stay upright' },
          { dayOfWeek: 'Wednesday', exerciseName: 'Dumbbell Shoulder Press', sets: 3, reps: '10', restSeconds: 60, notes: 'Neutral grip' },
          { dayOfWeek: 'Friday', exerciseName: 'Medicine Ball Slams', sets: 4, reps: '12', restSeconds: 45, notes: 'Explosive power' },
          { dayOfWeek: 'Friday', exerciseName: 'Farmer Walks', sets: 3, reps: '40 meters', restSeconds: 60, notes: 'Heavy dumbbells, proud chest' }
        ]
      }
    ];

    await WorkoutPlan.insertMany(workoutPlansData);

    // 7. Create Attendance Data
    console.log('[Seed] Creating Attendance logs...');
    const attendances = [];

    // Today's attendance for 5 members
    const today = normalizeDate(now);
    const todayCheckIns = [members[0], members[1], members[2], members[5], members[8]];
    todayCheckIns.forEach((m, idx) => {
      const checkIn = new Date(today);
      checkIn.setHours(7 + idx * 2, 15 + idx * 5, 0, 0);
      attendances.push({
        member: m._id,
        date: today,
        checkInTime: checkIn
      });
    });

    // Past attendance for Robert Chen (member 0) spanning past 20 days
    for (let i = 1; i <= 20; i++) {
      if (i % 7 !== 0) { // Skip 1 day a week (rest day)
        const pastDate = normalizeDate(addDays(now, -i));
        const checkIn = new Date(pastDate);
        checkIn.setHours(8, 30, 0, 0);
        attendances.push({
          member: members[0]._id,
          date: pastDate,
          checkInTime: checkIn
        });
      }
    }

    // Past attendance for Emily Davis (member 1)
    for (let i = 1; i <= 15; i++) {
      if (i % 2 === 0) {
        const pastDate = normalizeDate(addDays(now, -i));
        const checkIn = new Date(pastDate);
        checkIn.setHours(9, 15, 0, 0);
        attendances.push({
          member: members[1]._id,
          date: pastDate,
          checkInTime: checkIn
        });
      }
    }

    await Attendance.insertMany(attendances);

    // 8. Create Body Weight Logs
    console.log('[Seed] Creating Weight Logs...');
    const weightLogs = [];

    // Progressive weight loss for Robert Chen (starting 78.5 kg, down to 76.2 kg over 30 days)
    const robertWeights = [
      { daysAgo: 30, weight: 78.5 },
      { daysAgo: 25, weight: 78.1 },
      { daysAgo: 20, weight: 77.8 },
      { daysAgo: 15, weight: 77.2 },
      { daysAgo: 10, weight: 76.9 },
      { daysAgo: 5, weight: 76.5 },
      { daysAgo: 0, weight: 76.2 }
    ];

    robertWeights.forEach((w) => {
      weightLogs.push({
        member: members[0]._id,
        weight: w.weight,
        loggedAt: addDays(now, -w.daysAgo)
      });
    });

    // Progressive weight gain / muscle building for David Miller (starting 70.0 kg up to 72.8 kg)
    const davidWeights = [
      { daysAgo: 28, weight: 70.0 },
      { daysAgo: 21, weight: 70.8 },
      { daysAgo: 14, weight: 71.5 },
      { daysAgo: 7, weight: 72.2 },
      { daysAgo: 1, weight: 72.8 }
    ];

    davidWeights.forEach((w) => {
      weightLogs.push({
        member: members[2]._id,
        weight: w.weight,
        loggedAt: addDays(now, -w.daysAgo)
      });
    });

    await WeightLog.insertMany(weightLogs);

    console.log('====================================================');
    console.log('   GymFlow Seed Completed Successfully!');
    console.log('====================================================');
    console.log('Admin Account:');
    console.log('  Email:    admin@gymflow.com');
    console.log('  Password: Admin@123\n');
    console.log('Trainer Accounts:');
    console.log('  1. marcus.trainer@gymflow.com (Strength Training) / Trainer@123');
    console.log('  2. sarah.trainer@gymflow.com  (Weight Loss)        / Trainer@123');
    console.log('  3. alex.trainer@gymflow.com   (Functional)         / Trainer@123\n');
    console.log('Sample Member Accounts (Password: Member@123):');
    console.log('  1. robert.chen@example.com    (Active Annual Plan, Weight Chart Data)');
    console.log('  2. emily.davis@example.com    (Active Quarterly Plan)');
    console.log('  3. david.miller@example.com   (Active Monthly Plan, Weight Chart Data)');
    console.log('  4. jessica.taylor@example.com (Expiring Soon - 3 days left)');
    console.log('  5. james.thomas@example.com   (Expired Monthly Plan)');
    console.log('====================================================');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error] Database seeding failed:', err);
    process.exit(1);
  }
};

seedDatabase();
