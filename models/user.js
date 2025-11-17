// models/User.js (Updated)
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    branch: { type: String },
    semester: { type: String },
    college: { type: String },
    passingYear: { type: String },
    role: {
        type: String,
        enum: ['admin', 'teacher', 'student'],
        default: 'student'
    },
    profileImage: { type: String },
    isBlocked: {
        type: Boolean,
        default: false
    },
    savedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }]
});

module.exports = mongoose.model('User', userSchema);
