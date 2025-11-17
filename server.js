// server.js (Enhanced and More Robust Version)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { protect, checkRole } = require('./middleware/auth'); // <-- Move this up here!

const app = express();
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));

// Save a note to user's savedNotes
const User = require('./models/user');
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

// Get all saved notes for a user
// Old unprotected endpoint kept for backward compatibility but prefer protected below
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

// Protected: get saved notes for the authenticated user (no query param)
app.get('/api/user/saved-notes/me', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated.' });
    const user = await User.findById(userId).populate({ path: 'savedNotes', model: 'Note' });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user.savedNotes || []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch saved notes.' });
  }
});

// Serve static files from the 'public' directory (for your HTML files)
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
// server.js (यह है फाइनल कनेक्शन कोड)

// server.js (SOLUTION - OPTION 1)

// आपकी कनेक्शन स्ट्रिंग
const connectionString = 'mongodb+srv://vk5457396_db_user:v5g645b696pIetlC@noteshare.tpxb0en.mongodb.net/noteshare?retryWrites=true&w=majority&tls=true';

// कनेक्शन ऑप्शन
const connectionOptions = {
    serverSelectionTimeoutMS: 5000 // 5 सेकंड तक कोशिश करें
};

mongoose.connect(connectionString, connectionOptions)
.then(() => console.log('MongoDB connection is stable and successful with TLS enabled!'))
.catch(err => {
    console.error("CRITICAL MongoDB Connection Error:", err);
});
// Use the Note model defined in models/note.js (includes `branch`)
const Note = require('./models/note');
const Feedback = require('./models/feedback');

// Multer configuration (This is correct)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // This function will save files into the 'uploads' folder
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Avatar storage (separate folder)
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


// API to upload note
app.post('/api/upload', protect, upload.single('note-file'), async (req, res) => {
  try {
    // ✅ जोड़ा गया: टर्मिनल में लॉग करें कि हमें क्या मिला है
    console.log('Received file:', req.file);
    console.log('Received body:', req.body);

    // Check if a file was uploaded by multer
    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded. Make sure the input name is 'note-file'." });
    }

  const { title, subject, branch, year, semester, tags } = req.body;
    
  // Ensure required fields are present (including branch)
  if (!title || !subject || !branch || !year || !semester) {
    return res.status(400).json({ message: "Missing required fields: title, subject, branch, year, or semester." });
  }
    
    // req.user is set by protect middleware (it's the user document). Use its _id.
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated. Missing user information.' });
    }
    const uploader = req.user._id;
    const newNote = new Note({
      title,
      subject,
      branch,
      year,
      semester,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      filePath: req.file.path, // multer provides the file info
      status: 'pending',
      uploader: uploader
    });
// ...existing code...
app.get('/api/user/notes', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id ? req.user._id : null;
    if (!userId) return res.status(401).json({ message: 'Not authenticated.' });
    const notes = await Note.find({ uploader: userId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your notes.' });
  }
});

    await newNote.save();
    console.log('Note saved successfully to database.');
    res.status(201).json({ message: 'Note uploaded successfully!', note: newNote });

  } catch (err) {
    // ✅ बदला गया: अब यह एरर को बहुत स्पष्ट रूप से टर्मिनल में दिखाएगा
    console.error("!!! SERVER CRASH IN /api/upload !!!");
    console.error(err);
    res.status(500).json({ message: "A critical error occurred on the server.", error: err.message });
  }
});

// API to get all notes (This is correct)
// Register API (Updated)
// Login API
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-super-secret-key-that-should-be-long-and-random';
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
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: {
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
    }});
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});
const bcrypt = require('bcrypt');
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, branch, semester, college, passingYear, secretCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    let role = 'user';
    if (secretCode === "ADMIN_SECRET_CODE_123") {
      role = 'admin';
    } else if (secretCode === "FACULTY_SECRET_CODE_456") {
      role = 'faculty';
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ name, email, password: hashedPassword, branch, semester, college, passingYear, role });
    await newUser.save();

    res.status(201).json({
      message: `User registered successfully as ${role}!`,
      user: {
        name: newUser.name,
        email: newUser.email,
        branch: newUser.branch,
        semester: newUser.semester,
        college: newUser.college,
        passingYear: newUser.passingYear,
        role: newUser.role,
        isBlocked: newUser.isBlocked,
        _id: newUser._id,
        profileImage: newUser.profileImage || ""
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error during registration.", error: error.message });
  }
});
// Only show accepted notes to users
app.get('/api/notes', async (req, res) => {
  try {
    // Get query params for search and branch
    const { search = '', branch = '' } = req.query;
    let filter = { status: 'accepted' };
    if (branch) {
      // Case-insensitive branch filter
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
  } catch(err) {
     console.error("Error fetching notes:", err);
     res.status(500).json({ message: "Failed to fetch notes from the database." });
  }
});
// Accept a note (admin/faculty)
app.post('/api/admin/notes/:id/accept', protect, checkRole('admin', 'faculty'), async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { status: 'accepted' }, { new: true });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    res.json({ message: 'Note accepted successfully.', note });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// Reject a note (admin/faculty)
app.post('/api/admin/notes/:id/reject', protect, checkRole('admin', 'faculty'), async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    res.json({ message: 'Note rejected successfully.', note });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// ======== ADMIN / FACULTY ROUTES ========
const fs = require('fs'); // फाइल डिलीट करने के लिए

// सभी यूजर्स को देखना (सिर्फ एडमिन)
app.get('/api/admin/users', protect, checkRole('admin'), async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// किसी यूजर को ब्लॉक करना (सिर्फ एडमिन)
app.post('/api/admin/users/:id/block', protect, checkRole('admin'), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isBlocked: true });
  res.json({ message: 'User blocked successfully.' });
});

// किसी यूजर को अनब्लॉक करना (सिर्फ एडमिन)
app.post('/api/admin/users/:id/unblock', protect, checkRole('admin'), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isBlocked: false });
  res.json({ message: 'User unblocked successfully.' });
});

// Change a user's role (admin only)
app.put('/api/admin/user/:id/role', protect, checkRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required.' });
    const allowed = ['user', 'faculty', 'admin'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role.' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'Role updated.', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// किसी नोट को डिलीट करना (एडमिन और फैकल्टी)
app.delete('/api/admin/notes/:id', protect, checkRole('admin', 'faculty'), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }
    // फाइल को सर्वर से डिलीट करें
    fs.unlink(note.filePath, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// सभी नोट्स को देखना (एडमिन और फैकल्टी के लिए भी यही रूट है)
app.get('/api/admin/notes', protect, checkRole('admin', 'faculty'), async (req, res) => {
  const notes = await Note.find().sort({ createdAt: -1 });
  res.json(notes);
});

// Update note metadata (admin/faculty)
app.put('/api/admin/notes/:id', protect, checkRole('admin', 'faculty'), async (req, res) => {
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
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Admin metrics (counts, recent uploads, top branches)
app.get('/api/admin/metrics', protect, checkRole('admin'), async (req, res) => {
  try {
    const totalNotes = await Note.countDocuments();
    const pendingNotes = await Note.countDocuments({ status: 'pending' });
    const acceptedNotes = await Note.countDocuments({ status: 'accepted' });
    // recent uploads (last 7 days)
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUploads = await Note.find({ createdAt: { $gte: sevenDaysAgo } }).sort({ createdAt: -1 }).limit(20);
    // top branches
    const branches = await Note.aggregate([
      { $group: { _id: { $ifNull: ['$branch','Unknown'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({ totalNotes, pendingNotes, acceptedNotes, recentUploads, topBranches: branches });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// USER PROFILE UPDATE API
// PUT /api/profile (protected)
app.put('/api/profile', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, branch, semester, college, passingYear } = req.body;
    // Only allow these fields to be updated
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

const ensureDefaultUsers = async () => {
  const User = require('./models/user');
  const bcrypt = require('bcrypt');
  // Admin
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
    console.log('Default admin user created: admin@noteshare.com / admin123');
  } else {
    console.log('Default admin user already exists.');
  }
  // Faculty
  const facultyEmail = 'faculty@noteshare.com';
  const facultyPass = 'faculty123';
  const faculty = await User.findOne({ email: facultyEmail, role: 'faculty' });
  if (!faculty) {
    const hashed = await bcrypt.hash(facultyPass, 10);
    await User.create({
      name: 'Faculty',
      email: facultyEmail,
      password: hashed,
      role: 'faculty',
      semester: '',
      college: '',
      passingYear: ''
    });
    console.log('Default faculty user created: faculty@noteshare.com / faculty123');
  } else {
    console.log('Default faculty user already exists.');
  }
};

// Ensure default admin exists (vikash@2004, pass: 12345)


app.listen(5000, async () => {
  await ensureDefaultUsers();
  console.log('Server is running on port 5000');
});


// Upload avatar for authenticated user
app.post('/api/user/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated.' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    // delete previous avatar file if exists
    if (user.profileImage) {
      const prev = path.join(__dirname, user.profileImage);
      fs.unlink(prev, (err) => { if (err) {/* ignore */} });
    }
    // store relative path to serve via /uploads
    const relPath = path.join('uploads', 'avatars', path.basename(req.file.path)).replace(/\\/g, '/');
    user.profileImage = relPath;
    await user.save();
    res.json({ message: 'Avatar uploaded.', profileImage: user.profileImage });
  } catch (err) {
    res.status(500).json({ message: 'Avatar upload failed.', error: err.message });
  }
});

// Receive feedback from users (public)
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

// Admin: view feedback submissions
app.get('/api/admin/feedback', protect, checkRole('admin'), async (req, res) => {
  try {
    const items = await Feedback.find().sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch feedback.', error: err.message });
  }
});

// API: return JSON 404 for unknown API routes
app.use('/api', (req, res, next) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

// Generic error handler — if request was for /api, return JSON
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (req.path && req.path.startsWith('/api')) {
    return res.status(500).json({ message: 'Internal server error.', error: err.message });
  }
  next(err);
});