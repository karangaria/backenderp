const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Counter schema to store the current count for employee IDs
const counterSchema = new Schema({
    name: { type: String, required: true, unique: true },
    sequence_value: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;