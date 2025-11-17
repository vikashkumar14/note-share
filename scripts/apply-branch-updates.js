// scripts/apply-branch-updates.js
// Usage: node scripts/apply-branch-updates.js
// Reads scripts/branch-suggestions.csv and applies suggested branch updates to the DB.

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Note = require('../models/note');

const connectionString = 'mongodb+srv://vk5457396_db_user:v5g645b696pIetlC@noteshare.tpxb0en.mongodb.net/noteshare?retryWrites=true&w=majority&tls=true';

async function run() {
  const csvPath = path.join(__dirname, 'branch-suggestions.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('branch-suggestions.csv not found. Run fix-branches-suggest.js first.');
    process.exit(1);
  }
  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split('\n').slice(1).filter(Boolean);
  if (lines.length === 0) {
    console.log('No suggestions to apply.');
    process.exit(0);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(connectionString, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected. Applying updates...');

  let applied = 0;
  for (const l of lines) {
    // CSV format: noteId,title,subject,currentBranch,suggestedBranch
    const parts = parseCSVLine(l);
    const noteId = parts[0];
    const suggested = parts[4] || '';
    if (!noteId || !suggested) continue;
    try {
      const res = await Note.findByIdAndUpdate(noteId, { branch: suggested }, { new: true });
      if (res) applied++;
      console.log(`Updated ${noteId} -> ${suggested}`);
    } catch (err) {
      console.error(`Failed to update ${noteId}:`, err.message);
    }
  }

  console.log(`Applied ${applied} updates.`);
  await mongoose.disconnect();
}

function parseCSVLine(line) {
  // naive CSV parse for our generated format (no embedded newlines)
  const cols = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { cols.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) cols.push(cur);
  return cols.map(s => s.trim());
}

run().catch(err => { console.error(err); process.exit(1); });
