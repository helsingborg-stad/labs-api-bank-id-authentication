const express = require('express');
const router = express.Router();

router.use('/getNavet', require('./navet/api'));

module.exports = router;
