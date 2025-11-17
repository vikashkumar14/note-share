// scripts/check-note.js
// Usage: node scripts/check-note.js "search text"
// Searches notes by title or subject (case-insensitive) and prints details including branch.

const mongoose = require('mongoose');
const Note = require('../models/note');

const connectionString = 'mongodb+srv://vk5457396_db_user:v5g645b696pIetlC@noteshare.tpxb0en.mongodb.net/noteshare?retryWrites=true&w=majority&tls=true';

async function run() {
  const q = process.argv[2];
  if (!q) {
    console.error('Please provide search text. Example: node scripts/check-note.js "Programming in php"');
    process.exit(1);
  }
  await mongoose.connect(connectionString, { serverSelectionTimeoutMS: 5000 });
  const re = new RegExp(q, 'i');
  const results = await Note.find({ $or: [{ title: re }, { subject: re }] }).limit(50);
  if (!results || results.length === 0) {
    console.log('No notes found for:', q);
  } else {
    results.forEach(n => {
      console.log('---------------------------');
      console.log('ID:', n._id.toString());
      console.log('Title:', n.title);
      console.log('Subject:', n.subject);
      console.log('Branch:', n.branch || '<<missing>>');
      console.log('Year:', n.year);
      console.log('Semester:', n.semester);
      console.log('FilePath:', n.filePath);
      console.log('Status:', n.status);
    });
    console.log('--- Found', results.length, 'result(s) ---');
  }
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
