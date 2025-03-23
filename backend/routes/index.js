const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('./api/authRoute');
const userRoutes = require('./api/usersRoute');
const petRoutes = require('./api/petRoute');
const itemRoutes = require('./api/itemRoute');
const questRoutes = require('./api/questRoute');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pets', petRoutes);
router.use('/items', itemRoutes);
router.use('/quests', questRoutes);

module.exports = router;