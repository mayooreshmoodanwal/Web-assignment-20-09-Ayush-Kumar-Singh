const User = require('../models/User');

// GET /
const getLanding = (req, res) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin') return res.redirect('/admin/dashboard');
    if (role === 'trainer') return res.redirect('/trainer/dashboard');
    return res.redirect('/member/dashboard');
  }
  res.render('landing', {
    title: 'GymFlow — Manage Memberships. Track Progress. Train Smarter.',
    user: null
  });
};

// GET /login
const getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login - GymFlow',
    user: null
  });
};

// POST /login
const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.flash('error', 'Please provide both email and password');
      return res.redirect('/login');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/login');
    }

    if (!user.isActive) {
      req.flash('error', 'Your account has been deactivated. Please contact the administrator.');
      return res.redirect('/login');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/login');
    }

    // Save session
    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    req.flash('success', `Welcome back, ${user.name}!`);

    // Redirect according to role
    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (user.role === 'trainer') {
      return res.redirect('/trainer/dashboard');
    } else {
      return res.redirect('/member/dashboard');
    }
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'An error occurred during login. Please try again.');
    res.redirect('/login');
  }
};

// GET /register
const getRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Join GymFlow - Member Registration',
    user: null
  });
};

// POST /register
const postRegister = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword, gender, dateOfBirth } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      req.flash('error', 'Please fill in all required fields');
      return res.redirect('/register');
    }

    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/register');
    }

    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters long');
      return res.redirect('/register');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      req.flash('error', 'An account with this email already exists');
      return res.redirect('/register');
    }

    // Create new member
    const newMember = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password,
      role: 'member',
      gender: gender || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      isActive: true
    });

    await newMember.save();

    req.flash('success', 'Registration successful! You can now log in to your account.');
    res.redirect('/login');
  } catch (err) {
    console.error('Registration error:', err);
    req.flash('error', err.message || 'Registration failed. Please check your details.');
    res.redirect('/register');
  }
};

// GET /logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login?logged_out=1');
  });
};

module.exports = {
  getLanding,
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  logout
};
