const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('./api/auth');
const userRoutes = require('./api/users');
const petRoutes = require('./api/pets');
const itemRoutes = require('./api/items');
const questRoutes = require('./api/quests');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pets', petRoutes);
router.use('/items', itemRoutes);
router.use('/quests', questRoutes);

module.exports = router;