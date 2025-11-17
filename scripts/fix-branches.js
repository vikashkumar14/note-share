// scripts/fix-branches.js
// Usage: node scripts/fix-branches.js
// This script finds Note documents with missing/empty branch and attempts to infer a branch
// from title/subject/tags using simple heuristics, then updates the document in-place.

const mongoose = require('mongoose');
const Note = require('../models/note');

const connectionString = 'mongodb+srv://vk5457396_db_user:v5g645b696pIetlC@noteshare.tpxb0en.mongodb.net/noteshare?retryWrites=true&w=majority&tls=true';

async function inferBranchForNote(note) {
  const text = `${note.title || ''} ${note.subject || ''} ${ (note.tags || []).join(' ') }`.toLowerCase();
  if (/php|laravel|symfony|cakephp|zend|codeigniter|programming in php/.test(text)) return 'CS';
  if (/computer|cs|software|programming/.test(text)) return 'CS';
  if (/ece|electronics|signals|communication|microcontroller/.test(text)) return 'ECE';
  if (/mech|thermo|thermodynamics|mechanical|me/.test(text)) return 'ME';
  if (/ee\b|electrical|power|circuit/.test(text)) return 'EE';
  if (/civil|ce\b|structure|survey/.test(text)) return 'CE';
  if (/it\b|information technology/.test(text)) return 'IT';
  if (/bca\b|bachelor of computer application/.test(text)) return 'BCA';
  // fallback
  return 'General';
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(connectionString, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected. Scanning notes...');

  const missing = await Note.find({ $or: [ { branch: { $exists: false } }, { branch: null }, { branch: '' }, { branch: /^\s*$/ }, { branch: /^N\/?A$/i } ] });
  console.log(`Found ${missing.length} notes with missing/empty branch.`);
  if (missing.length === 0) {
    await mongoose.disconnect();
    console.log('Nothing to update. Exiting.');
    return;
  }

  let updated = 0;
  for (const note of missing) {
    const suggested = await inferBranchForNote(note);
    console.log(`Note ${note._id}: "${note.title}" -> setting branch="${suggested}"`);
    note.branch = suggested;
    await note.save();
    updated++;
  }

  console.log(`Updated ${updated} note(s). Disconnecting.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});