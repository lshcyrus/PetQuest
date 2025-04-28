const express = require('express');
const router = express.Router();

const { 
  createPet,
  getPets,
  getPet,
  feedPet,
  playWithPet,
  selectPet,
  renamePet
} = require('../../controllers/petController');

const { protect } = require('../../middleware/auth');

const { 
  validatePetCreation, 
  validateResults,
  validatePetRename
} = require('../../middleware/validators');

router.route('/')
  .post(protect, validatePetCreation, validateResults, createPet)
  .get(protect, getPets);

router.route('/:id')
  .get(protect, getPet);

router.put('/:id/feed', protect, feedPet);
router.put('/:id/play', protect, playWithPet);
router.put('/:id/select', protect, selectPet);
router.put('/:id/rename', protect, validatePetRename, validateResults, renamePet);

module.exports = router;