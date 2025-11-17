// scripts/fix-branches-suggest.js
// Usage: node scripts/fix-branches-suggest.js
// Scans notes with missing/empty branch and writes suggestions to scripts/branch-suggestions.csv

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Note = require('../models/note');

const connectionString = 'mongodb+srv://vk5457396_db_user:v5g645b696pIetlC@noteshare.tpxb0en.mongodb.net/noteshare?retryWrites=true&w=majority&tls=true';

function inferBranchForNote(note) {
  const text = `${note.title || ''} ${note.subject || ''} ${ (note.tags || []).join(' ') }`.toLowerCase();
  if (/php|laravel|symfony|cakephp|zend|codeigniter|programming in php/.test(text)) return 'CS';
  if (/computer|\bcs\b|software|programming/.test(text)) return 'CS';
  if (/ece|electronics|signals|communication|microcontroller/.test(text)) return 'ECE';
  if (/mech|thermo|thermodynamics|mechanical|\bme\b/.test(text)) return 'ME';
  if (/\bee\b|electrical|power|circuit/.test(text)) return 'EE';
  if (/civil|\bce\b|structure|survey/.test(text)) return 'CE';
  if (/\bit\b|information technology/.test(text)) return 'IT';
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

  const outPath = path.join(__dirname, 'branch-suggestions.csv');
  const header = 'noteId,title,subject,currentBranch,suggestedBranch\n';
  fs.writeFileSync(outPath, header, 'utf8');

  for (const note of missing) {
    const suggested = inferBranchForNote(note);
    const safeTitle = (note.title || '').replace(/"/g, '""');
    const safeSubject = (note.subject || '').replace(/"/g, '""');
    const line = `"${note._id}","${safeTitle}","${safeSubject}","${note.branch || ''}","${suggested}"\n`;
    fs.appendFileSync(outPath, line, 'utf8');
  }

  console.log(`Wrote suggestions to ${outPath}. Review before applying.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
