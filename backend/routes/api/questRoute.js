const express = require('express');
const router = express.Router();

const { 
  getQuests,
  getQuest,
  startQuest,
  completeQuest
} = require('../../controllers/questController');

const { protect } = require('../../middleware/auth');

router.route('/')
  .get(protect, getQuests);

router.route('/:id')
  .get(protect, getQuest);

router.post('/:id/start', protect, startQuest);
router.post('/:id/complete', protect, completeQuest);

module.exports = router;