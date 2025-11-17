// server.js - Complete Node.js + Express + MongoDB server with JWT auth and Render deployment
// ==================== REQUIRES SECTION ====================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
// ==================== APP INITIALIZATION ====================
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-long-and-random';
// ==================== CORS CONFIGURATION ====================
app.use(express.json());
app.use(cors({
  origin: [
    'https://noteshare-y2kp.onrender.com',
    'https://note-share-yfyr.onrender.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));
// ==================== MONGODB CONNECTION ====================
const connectionString = 'mongodb+srv://vk5457396_db_user:v5g645b696pIetlC@noteshare.tpxb0en.mongodb.net/noteshare?retryWrites=true&w=majority&tls=true';
const connectionOptions = {
  serverSelectionTimeoutMS: 5000
};
mongoose.connect(connectionString, connectionOptions)
  .then(() => console.log('✓ MongoDB connection successful with TLS enabled'))
  .catch(err => {
    console.error('✗ CRITICAL MongoDB Connection Error:', err);
  });
// ==================== MODELS ====================
const User = require('./models/user');
const Note = require('./models/note');
const Feedback = require('./models/feedback');
// ==================== MULTER CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads', 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, Date.now() + ext);
  }
});
const avatarUpload = multer({ storage: avatarStorage });
// ==================== MIDDLEWARE ====================
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};
const checkRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated.' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions.' });
  }
  next();
};
// ==================== STATIC FILES ====================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ==================== AUTHENTICATION APIS ====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, branch, semester, college, passingYear, secretCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    let role = 'student';
    if (secretCode === 'ADMIN_SECRET_CODE_123') {
      role = 'admin';
    } else if (secretCode === 'TEACHER_SECRET_CODE_456') {
      role = 'teacher';
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      branch,
      semester,
      college,
      passingYear,
      role,
      profileImage: ''
    });
    await newUser.save();
    res.status(201).json({
      message: `User registered successfully as ${role}!`,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        branch: newUser.branch,
        semester: newUser.semester,
        college: newUser.college,
        passingYear: newUser.passingYear,
        role: newUser.role,
        isBlocked: newUser.isBlocked,
        profileImage: newUser.profileImage || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password.' });
    }
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        branch: user.branch,
        role: user.role,
        semester: user.semester,
        college: user.college,
        passingYear: user.passingYear,
        isBlocked: user.isBlocked,
        profileImage: user.profileImage || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});
// ==================== NOTE UPLOAD API ====================
app.post('/api/upload', protect, upload.single('note-file'), async (req, res) => {
  try {
    console.log('Received file:', req.file);
    console.log('Received body:', req.body);
    if (!req.file) {
      return res.status(400).json({ message: 'No file was uploaded. Make sure the input name is "note-file".' });
    }
    const { title, subject, branch, year, semester, tags } = req.body;
    if (!title || !subject || !branch || !year || !semester) {
      return res.status(400).json({ message: 'Missing required fields: title, subject, branch, year, or semester.' });
    }
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated. Missing user information.' });
    }
    const uploader = req.user.userId;
    const newNote = new Note({
      title,
      subject,
      branch,
      year,
      semester,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      filePath: req.file.path,
      status: 'pending',
      uploader: uploader
    });
    await newNote.save();
    console.log('Note saved successfully to database.');
    res.status(201).json({ message: 'Note uploaded successfully!', note: newNote });
  } catch (err) {
    console.error('!!! SERVER CRASH IN /api/upload !!!');
    console.error(err);
    res.status(500).json({ message: 'A critical error occurred on the server.', error: err.message });
  }
});
// ==================== USER NOTES APIS ====================
app.get('/api/user/notes', protect, async (req, res) => {
  try {
    const userId = req.user && req.user.userId ? req.user.userId : null;
    if (!userId) return res.status(401).json({ message: 'Not authenticated.' });
    const notes = await Note.find({ uploader: userId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your notes.' });
  }
});
app.get('/api/user/saved-notes/me', protect, async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated.' });
    const user = await User.findById(userId).populate({ path: 'savedNotes', model: 'Note' });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user.savedNotes || []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch saved notes.' });
  }
});
app.post('/api/user/save-note', async (req, res) => {
  try {
    const { userId, noteId } = req.body;
    if (!userId || !noteId) return res.status(400).json({ message: 'Missing userId or noteId.' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.savedNotes) user.savedNotes = [];
    if (!user.savedNotes.includes(noteId)) {
      user.savedNotes.push(noteId);
      await user.save();
    }
    res.json({ message: 'Note saved successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save note.' });
  }
});
// ==================== USER PROFILE APIS ====================
app.get('/api/user/saved-notes', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: 'Missing userId.' });
    const user = await User.findById(userId).populate({
      path: 'savedNotes',
      model: 'Note'
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user.savedNotes || []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch saved notes.' });
  }
});
app.put('/api/profile', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, branch, semester, college, passingYear } = req.body;
    const updateFields = {};
    if (name) updateFields.name = name;
    if (branch) updateFields.branch = branch;
    if (semester) updateFields.semester = semester;
    if (college) updateFields.college = college;
    if (passingYear) updateFields.passingYear = passingYear;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );
    res.json({ message: 'Profile updated successfully!', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile.', error: error.message });
  }
});
app.post('/api/user/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated.' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.profileImage) {
      const prev = path.join(__dirname, user.profileImage);
      fs.unlink(prev, (err) => { if (err) {/* ignore */} });
    }
    const relPath = path.join('uploads', 'avatars', path.basename(req.file.path)).replace(/\\/g, '/');
    user.profileImage = relPath;
    await user.save();
    res.json({ message: 'Avatar uploaded.', profileImage: user.profileImage });
  } catch (err) {
    res.status(500).json({ message: 'Avatar upload failed.', error: err.message });
  }
});
// ==================== PUBLIC NOTES API ====================
app.get('/api/notes', async (req, res) => {
  try {
    const { search = '', branch = '' } = req.query;
    let filter = { status: 'accepted' };
    if (branch) {
      filter.branch = { $regex: `^${branch}$`, $options: 'i' };
    }
    let notes = await Note.find(filter).sort({ createdAt: -1 });
    if (search) {
      const q = search.toLowerCase();
      notes = notes.filter(note =>
        (note.title && note.title.toLowerCase().includes(q)) ||
        (note.subject && note.subject.toLowerCase().includes(q)) ||
        (note.branch && note.branch.toLowerCase().includes(q)) ||
        (String(note.year).toLowerCase().includes(q)) ||
        (String(note.semester).toLowerCase().includes(q))
      );
    }
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ message: 'Failed to fetch notes from the database.' });
  }
});
// ==================== ADMIN APIS ====================
app.get('/api/admin/users', protect, checkRole('admin'), async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users.', error: err.message });
  }
});
app.post('/api/admin/users/:id/block', protect, checkRole('admin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: true });
    res.json({ message: 'User blocked successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error blocking user.', error: err.message });
  }
});
app.post('/api/admin/users/:id/unblock', protect, checkRole('admin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBlocked: false });
    res.json({ message: 'User unblocked successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error unblocking user.', error: err.message });
  }
});
app.put('/api/admin/user/:id/role', protect, checkRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required.' });
    const allowed = ['student', 'teacher', 'admin'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'Role updated.', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating role.', error: err.message });
  }
});
app.get('/api/admin/notes', protect, checkRole('admin', 'teacher'), async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notes.', error: err.message });
  }
});
app.post('/api/admin/notes/:id/accept', protect, checkRole('admin', 'teacher'), async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { status: 'accepted' }, { new: true });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    res.json({ message: 'Note accepted successfully.', note });
  } catch (err) {
    res.status(500).json({ message: 'Error accepting note.', error: err.message });
  }
});
app.post('/api/admin/notes/:id/reject', protect, checkRole('admin', 'teacher'), async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    res.json({ message: 'Note rejected successfully.', note });
  } catch (err) {
    res.status(500).json({ message: 'Error rejecting note.', error: err.message });
  }
});
app.delete('/api/admin/notes/:id', protect, checkRole('admin', 'teacher'), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }
    fs.unlink(note.filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting note.', error: err.message });
  }
});
app.put('/api/admin/notes/:id', protect, checkRole('admin', 'teacher'), async (req, res) => {
  try {
    const allowed = ['title', 'subject', 'branch', 'year', 'semester', 'tags', 'status'];
    const updates = {};
    for (const key of Object.keys(req.body)) {
      if (allowed.includes(key)) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No valid fields to update.' });
    const note = await Note.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    res.json({ message: 'Note updated.', note });
  } catch (err) {
    res.status(500).json({ message: 'Error updating note.', error: err.message });
  }
});
app.get('/api/admin/metrics', protect, checkRole('admin'), async (req, res) => {
  try {
    const totalNotes = await Note.countDocuments();
    const pendingNotes = await Note.countDocuments({ status: 'pending' });
    const acceptedNotes = await Note.countDocuments({ status: 'accepted' });
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUploads = await Note.find({ createdAt: { $gte: sevenDaysAgo } }).sort({ createdAt: -1 }).limit(20);
    const branches = await Note.aggregate([
      { $group: { _id: { $ifNull: ['$branch', 'Unknown'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({ totalNotes, pendingNotes, acceptedNotes, recentUploads, topBranches: branches });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching metrics.', error: err.message });
  }
});
app.get('/api/admin/feedback', protect, checkRole('admin'), async (req, res) => {
  try {
    const items = await Feedback.find().sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch feedback.', error: err.message });
  }
});
// ==================== FEEDBACK API ====================
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ message: 'All fields are required.' });
    const fb = new Feedback({ name, email, message });
    await fb.save();
    res.status(201).json({ message: 'Thank you for your feedback!' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save feedback.', error: err.message });
  }
});
// ==================== SERVER STARTUP & DEFAULTS ====================
const ensureDefaultUsers = async () => {
  try {
    const adminEmail = 'admin@noteshare.com';
    const adminPass = 'admin123';
    const admin = await User.findOne({ email: adminEmail, role: 'admin' });
    if (!admin) {
      const hashed = await bcrypt.hash(adminPass, 10);
      await User.create({
        name: 'Admin',
        email: adminEmail,
        password: hashed,
        role: 'admin',
        semester: '',
        college: '',
        passingYear: ''
      });
      console.log('✓ Default admin user created: admin@noteshare.com / admin123');
    } else {
      console.log('✓ Default admin user already exists.');
    }
    const teacherEmail = 'teacher@noteshare.com';
    const teacherPass = 'teacher123';
    const teacher = await User.findOne({ email: teacherEmail, role: 'teacher' });
    if (!teacher) {
      const hashed = await bcrypt.hash(teacherPass, 10);
      await User.create({
        name: 'Teacher',
        email: teacherEmail,
        password: hashed,
        role: 'teacher',
        semester: '',
        college: '',
        passingYear: ''
      });
      console.log('✓ Default teacher user created: teacher@noteshare.com / teacher123');
    } else {
      console.log('✓ Default teacher user already exists.');
    }
  } catch (err) {
    console.error('Error creating default users:', err);
  }
};
// ==================== NOTES BY BRANCH ====================
app.get('/api/notes', async (req, res) => {
  try {
    const { branch } = req.query;
    if (!branch) {
      return res.status(400).json({ message: 'Branch parameter is required' });
    }
    
    const notes = await Note.find({ branch })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
      
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes by branch:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ==================== API 404 & ERROR HANDLER ====================
app.use('/api', (req, res, next) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (req.path && req.path.startsWith('/api')) {
    return res.status(500).json({ message: 'Internal server error.', error: err.message });
  }
  next(err);
});
// ==================== SERVER LISTEN ====================
app.listen(PORT, async () => {
  await ensureDefaultUsers();
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  🚀 Server running on port ${PORT}        ║`);
  console.log(`║  📊 Environment: ${process.env.NODE_ENV || 'production'}          ║`);
  console.log(`║  🌍 CORS Enabled for Render & localhost ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});
module.exports = app;
