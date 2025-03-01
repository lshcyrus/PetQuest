const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('./api/authRoute');
const userRoutes = require('./api/usersRoute');
const petRoutes = require('./api/petsRoute');
const itemRoutes = require('./api/itemsRoute');
const questRoutes = require('./api/questsRoute');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pets', petRoutes);
router.use('/items', itemRoutes);
router.use('/quests', questRoutes);

module.exports = router;