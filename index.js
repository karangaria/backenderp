const express = require("express");
const cors = require('cors');

require("./db/confiq");
const User = require("./db/user");
const Leave = require("./db/leave");
const Employee = require("./db/employee");
const Attendance = require("./db/attendance");
const Break = require("./db/break");


const Counter = require('./db/counter');

const initializeCounter = async () => {
    const existingCounter = await Counter.findOne({ name: 'employee_id' });
    if (!existingCounter) {
        const counter = new Counter({ name: 'employee_id', sequence_value: 0 });
        await counter.save();
    }
};

initializeCounter(); // Run the counter initialization once
const otpStore = {}; // email -> otp

const app = express();
app.use(express.json());
app.use(cors()); // 👈 Enables CORS for all routes
const Jwt = require("jsonwebtoken");
const JwtKey = "ecomm";

app.post("/login",async (req,resp)=>{
    const { username, password } =req.body;
    if (!username || !password) {
        return resp.status(400).send({ message: "Username and password are required" });
      }

try{
    const  user = await User.findOne({username});
    if(user){
        if(user.password === password){
            Jwt.sign({user}, JwtKey,{expiresIn : "2h"},(err,token)=>{
                if(err){
                    resp.status(404).send({message:"Seomething went wrong"});

                }
                resp.send({ user , auth:token});
            })
            // resp.send({
            //     message:"Login Successful",user
            // })
        }else{
            resp.status(401).send({message:"Invalid Password"});
        }

    }
    else{
        resp.status(404).send({message:"User Not Found"});
    }
    

}catch{

}
});

app.post("/send-otp", async (req, resp) => {
    const { email } = req.body;
    if (!email) {
        return resp.status(400).send({ message: "Email is required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return resp.status(404).send({ message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
        otpStore[email] = otp;

        console.log(`OTP for ${email}: ${otp}`); // Dummy "send"

        resp.send({ message: `OTP sent successfully (check console in real app. ${otp})` });
    } catch (err) {
        resp.status(500).send({ message: "Something went wrong" });
    }
});
app.post("/reset-password", async (req, resp) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return resp.status(400).send({ message: "All fields are required" });
    }

    const storedOtp = otpStore[email];
    if (!storedOtp || storedOtp != otp) {
        return resp.status(401).send({ message: "Invalid or expired OTP" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return resp.status(404).send({ message: "User not found" });
        }

        user.password = newPassword;
        await user.save();
        delete otpStore[email]; // Clean up OTP

        resp.send({ message: "Password updated successfully" });
    } catch (err) {
        resp.status(500).send({ message: "Something went wrong" });
    }
});
app.post("/create-leave", async (req, resp) => {
    const { from, to, type, reason } = req.body;

    if (!from || !to) {
        return resp.status(400).send({ message: "From and To dates are required" });
    }

    try {
        // Assuming you have a Leave model and user info
        const leave = new Leave({
            from,
            to,
            type,
            reason,
            // userId: req.user._id // include user ID if applicable
        });

        const result = await leave.save();
        resp.status(201).send(result);

    } catch (error) {
        console.error(error);
        resp.status(500).send({ message: "Error creating leave request" });
    }
});

app.post("/create-employee", async (req, resp) => {
    const {
        email,
        password,
        role,
        account_access,
        gender,
        first_name,
        last_name,
        dob,
        contact_no,
        department,
        position,
        doj,
        image,
        reporting_manager,
        reporting_hr,
        shift,
        bank_name,
        account_number,
        ifsc_code,
        uan,
        pan,
        location,
        created_at
      } = req.body;
    if (!email || !password || !account_access || !role || !gender || !first_name || !last_name || !contact_no || !dob || !department || !position || !doj || !bank_name ||!account_number ||!uan ||!pan ||!ifsc_code || !location) {
        return resp.status(400).send({ message: "This fields are required" });
    }

    try {
        const counter = await Counter.findOneAndUpdate(
            { name: "employee_id" },
            { $inc: { sequence_value: 1 } },
            { new: true, upsert: true } // upsert creates the counter if it doesn't exist
        );

        let employeeId = `EMP-${String(counter.sequence_value).padStart(4, '0')}`;

        // Check if employee_id already exists in the Employee collection
        let employeeExists = await Employee.findOne({ employee_id: employeeId });

        // If the employee_id exists, increment the counter and generate a new ID
        while (employeeExists) {
            // Increment the counter again
            const newCounter = await Counter.findOneAndUpdate(
                { name: "employee_id" },
                { $inc: { sequence_value: 1 } },
                { new: true }
            );
            employeeId = `EMP-${String(newCounter.sequence_value).padStart(4, '0')}`;
            employeeExists = await Employee.findOne({ employee_id: employeeId });
        }
        // Assuming you have a Leave model and user info
        const employee = new Employee({
            email,
            password,
            role,
            account_access,
            gender,
            first_name,
            last_name,
            dob,
            contact_no,
            department,
            position,
            doj,
            image,
            reporting_manager,
            reporting_hr,
            shift,
            bank_name,
            account_number,
            ifsc_code,
            uan,
            pan,
            location,
            employee_id:employeeId,
            created_at: new Date().toISOString()
            // userId: req.user._id // include if you're associating with an authenticated user
          });

        const result = await employee.save();
        const user = new User({
            email,
            password, // You may want to hash the password before saving
            username:result.first_name,
            role:result.account_access,
            employee_id: result._id
        });

        // Save the user document to the database
        const savedUser = await user.save();
        resp.status(201).send(result);

    } catch (error) {
        console.error(error);
        resp.status(500).send({ message: "Error creating leave request" });
    }
});
app.get("/employees", async (req, res) => {
    try {
        // Get page and limit from query parameters, with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit; // Skip based on page and limit

        // Fetch the employees with pagination
        const employees = await Employee.find()
            .skip(skip)
            .limit(limit);

        // Fetch the total number of employees (for calculating total pages)
        const totalEmployees = await Employee.countDocuments();

        // Calculate total pages
        const totalPages = Math.ceil(totalEmployees / limit);

        // Send response with paginated data
        res.status(200).send({
            employees,
            totalEmployees,
            totalPages,
            currentPage: page,
            limit,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error fetching employees" });
    }
});

app.post("/mark-attendance", async (req, resp) => {
    const { user_id, time, date,status } = req.body;

    if (!user_id || !date) {
        return resp.status(400).send({ message: "Employee and  date are required" });
    }

    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Assuming you have a Leave model and user info
        const attendance = new Attendance({
            user_id,
            punchInTime:time,
            date,
            ip,
            status
            // userId: req.user._id // include user ID if applicable
        });

        const result = await attendance.save();
        resp.status(201).send(result);

    } catch (error) {
        console.error(error);
        resp.status(500).send({ message: "Error creating attendance request" });
    }
});
const isValidDate = (date) => {
    return !isNaN(Date.parse(date));
  };
app.get('/get-attendance', async (req, res) => {
    const { user_id, date } = req.query;
  
    if (!user_id || !date) {
      return res.status(400).json({ message: 'Missing user_id or date' });
    }
  
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
  
    try {
      const attendance = await Attendance.findOne({ user_id, date });
  
      if (!attendance) {
        return res.status(404).json({ message: 'Attendance not found' });
      }
  
      res.json(attendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post("/update-attendance", async (req, resp) => {
    const { user_id, time, date, status } = req.body;

    if (!user_id || !date) {
        return resp.status(400).send({ message: "Employee and date are required" });
    }

    try {

        // Assuming you have a Leave model and user info
        let attendance = await Attendance.findOne({ user_id, date });
       

//   return resp.send(punchOutMinutes);
        if (attendance) {
             const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes; // return time in minutes from midnight
  };

  const punchInMinutes = parseTime(attendance.punchInTime);
  const punchOutMinutes = parseTime(attendance.punchInTime);
   const diffMinutes = punchOutMinutes - punchInMinutes;
  const diffHours = diffMinutes / 60;
    if (diffHours > 7) {
    attendance.attendance_status = "Present";
  } else if (diffHours < 4) {
    attendance.attendance_status = "Absent";
  } 
   else if (diffHours > 4 && diffHours < 7) {
    attendance.statattendance_statusus = "Halfday";
  }else {
    attendance.attendance_status = "Absent"; // or whatever default
  }


//   resp.send(attendance.attendance_status);
  
            // If the attendance record exists, update the status and punchInTime
            attendance.status = "out" // if status is provided, update it
            attendance.punchOutTime = time; // if time is provided, update it

            // Save the updated record
            const result = await attendance.save();
            resp.status(200).send(result);
        } else {
            // If the attendance record does not exist, create a new one
            attendance = new Attendance({
                punchInTime: time, 
                status
            });

            const result = await attendance.save();
            resp.status(201).send(result);
        }

    } catch (error) {
        console.error(error);
        resp.status(500).send({ message: "Error creating or updating attendance request" });
    }
});
app.get("/attendance", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { selectedMonth, year, user_id } = req.query;

    const month = parseInt(selectedMonth);
    const yearInt = parseInt(year);

    const startDate = new Date(yearInt, month - 1, 1);
    const endDate = new Date(yearInt, month, 0);

    // Fetch all breaks for the user in that month
    const breaks = await Break.find({
      user_id,
      date: { $gte: startDate, $lt: endDate }
    });

    // Group breaks by date string (YYYY-MM-DD)
    const breaksByDate = breaks.reduce((acc, b) => {
      const dateKey = b.date.toISOString().split('T')[0];
      acc[dateKey] = (acc[dateKey] || 0) + parseFloat(b.time || '0');
      return acc;
    }, {});

    // Fetch attendance records for the user with pagination
    const attendance = await Attendance.find({
      user_id,
      date: { $gte: startDate, $lt: endDate }
    })
      .skip(skip)
      .limit(limit);

    // Attach totalBreaks to each attendance record
    const attendanceWithBreaks = attendance.map(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      return {
        ...record.toObject(),
        totalBreaks: breaksByDate[dateKey] ? parseFloat(breaksByDate[dateKey].toFixed(2)) : 0
      };
    });

    const totalAttendance = await Attendance.countDocuments({
      user_id,
      date: { $gte: startDate, $lt: endDate }
    });

    const totalPages = Math.ceil(totalAttendance / limit);

    res.status(200).send({
      attendance: attendanceWithBreaks,
      totalAttendance,
      totalPages,
      currentPage: page,
      limit,
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error fetching attendance" });
  }
});

app.post("/mark-break", async (req, resp) => {
    const { user_id, breakStart, date,status } = req.body;

    if (!user_id || !date ) {
        return resp.status(400).send({ message: "Employee and  date are required" });
    }

    try {
        // Assuming you have a Leave model and user info
        const breaks = new Break({
            user_id,
            breakStart,
            date,
            status,
            breakEnd:null,
            time:null
            // userId: req.user._id // include user ID if applicable
        });

        const result = await breaks.save();
        resp.status(201).send(result);

    } catch (error) {
        console.error(error);
        resp.status(500).send({ message: "Error creating attendance request" });
    }
});
 

app.get('/get-break', async (req, res) => {
    const { user_id, date } = req.query;
  
    if (!user_id || !date) {
      return res.status(400).json({ message: 'Missing user_id or date' });
    }
  
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
  
    try {
        const breaks = await Break.findOne({ user_id, date }).sort({ createdAt: -1 });
  
      if (!breaks) {
        return res.status(404).json({ message: 'Attendance not found' });
      }
  
      res.json(breaks);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  
  app.post("/end-break", async (req, resp) => {
    const { user_id, time, date, status } = req.body;

    if (!user_id || !date) {
        return resp.status(400).send({ message: "Employee and date are required" });
    }

    try {

        // Assuming you have a Leave model and user info
        let break_end = await Break.findOne({ user_id, date ,status});

        if (break_end) {
            // If the attendance record exists, update the status and punchInTime
            break_end.status = "working" // if status is provided, update it
            break_end.breakEnd = time; // if time is provided, update it

            // Save the updated record
            const result = await break_end.save();
            resp.status(200).send(result);
        } 

    } catch (error) {
        console.error(error);
        resp.status(500).send({ message: "Error creating or updating attendance request" });
    }
});
const parseTimeToDate = (timeStr, dateStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) {
        hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }

    const date = new Date(dateStr);
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
};

const date = "2025-05-23";
const breakStart = "12:51 PM";
const breakEnd = "12:52 PM";

const start = parseTimeToDate(breakStart, date);
const end = parseTimeToDate(breakEnd, date);

const durationMs = end - start;
const durationHrs = (durationMs / (1000 * 60 * 60)).toFixed(2);

console.log(`Duration: ${durationHrs} hours`); // Output: "0.02 hours"

app.post("/change-break", async (req, resp) => {
    const { breakEnd, user_id, date, status } = req.body;

    if (!user_id || !date) {
        return resp.status(400).send({ message: "Employee and date are required" });
    }

    try {
        let break_end = await Break.findOne({ user_id, date, status });

        if (break_end) {
            break_end.status = "working";
            break_end.breakEnd = breakEnd;

            const end = parseTimeToDate(breakEnd, date); // if breakEnd is also "01:02 PM"
            const start = parseTimeToDate(break_end.breakStart, date);

            const durationMs = end - start;

            const durationHrs = (durationMs / (1000 * 60 * 60)).toFixed(2);
            break_end.time = durationHrs;

            const result = await break_end.save();
            return resp.status(200).send({ result, durationHrs });
        }

        resp.status(404).send({ message: "Break record not found" });

    } catch (error) {
        console.error(error);
        resp.status(500).send({ message: "Error updating break record" });
    }
});



app.get('/all-break', async (req, res) => {
    const { user_id, date } = req.query;
  
    if (!user_id || !date) {
      return res.status(400).json({ message: 'Missing user_id or date' });
    }
  
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
  
    try {
const breaks = await Break.find({ user_id, date }).sort({ createdAt: -1 });
  
      if (!breaks) {
        return res.status(404).json({ message: 'Attendance not found' });
      }
  
      res.json(breaks);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get("/check-email", async(req,resp)=>{
    const { email } = req.query;
    const response = await Employee.findOne({ email});

    resp.send(response);

  });
app.listen(5000)
