// middleware/auth.js (New File)
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const JWT_SECRET = 'your-super-secret-key-that-should-be-long-and-random';

// यह Middleware चेक करता है कि यूजर लॉग-इन है या नहीं
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.userId).select('-password');
            if (req.user.isBlocked) {
                return res.status(403).json({ message: 'Access denied. Your account is blocked.' });
            }
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// यह Middleware चेक करता है कि यूजर का रोल सही है या नहीं
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Requires ${roles.join(' or ')} role.` });
        }
        next();
    };
};

module.exports = { protect, checkRole };