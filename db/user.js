const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  employee_id: String,
  username:String,
  role:String

});

module.exports = mongoose.model("users", userSchema);