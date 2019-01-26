const mongoose = require('mongoose');
require('dotenv').load();

mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});

module.exports = {mongoose};