const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  email: String,
  role: String,
  account_access:String,
  gender:String,
  first_name:String,
  last_name:String,
  dob:String,
  contact_no:String,
  department:String,
  position:String,
  doj:String,
  image:String,
  reporting_manager:String,
  reporting_hr:String,
  shift:String,
  bank_name:String,
  account_number:String,
  ifsc_code:String,
  uan:String,
  pan:String,
  location:String,
  created_at:String,
  employee_id:String


});

module.exports = mongoose.model("employees", employeeSchema);