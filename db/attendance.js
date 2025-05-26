const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  user_id: String,
  latitute: String,
  longitude:String,
  ip:String,
  date:Date,
  login:String,
  logout:String,
  status:String,
  created_at:String,
  punchInTime:String,
  punchOutTime:String,
  attendance_status:String



});

module.exports = mongoose.model("attendance", attendanceSchema);