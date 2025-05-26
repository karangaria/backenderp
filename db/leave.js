const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  from: String,
  to: String,
  type: String,
  reason:String
});

module.exports = mongoose.model("leaves", userSchema);