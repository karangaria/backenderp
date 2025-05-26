const mongoose = require("mongoose");

const breakSchema = new mongoose.Schema({
  user_id: String,
  breakStart: String,
  breakEnd: String,
  time: String,
  longitude:String,
  breakDuration:String,
  date:Date,
  status:String



});

module.exports = mongoose.model("break_employees", breakSchema);