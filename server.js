const express = require('express');
const app = express();
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
app.use(express.json());
const JWT_SECRET = 'COMP3123_secret_key';

// Helper functions
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

// DB Connection
const MONGO_URI = 'mongodb+srv://ljcaridi:COMP3123@cluster0.o9paj.mongodb.net/' +
    '?retryWrites=true&w=majority&appName=Cluster0'
mongoose.connect(MONGO_URI, {});
mongoose.connection.on('connected', () => {
    console.log('MongoDB Connected');
});

//Schema
const Schema = mongoose.Schema;
const userSchema = new Schema(
    {
    "username": String,
    "email": String,
    "password": String,
    "created_at": Date.now(),
    "updated_at": Date
    });
const employeeSchema = new Schema({
    "first_name": String,
    "last_name": String,
    "email": String,
    "position": String,
    "salary": Number,
    "date_of_joining": Date,
    "department": String,
    "created_at": Date.now(),
    "updated_at": Date
})

// Models
const user = mongoose.model('User', userSchema);
const employee = mongoose.model('Employee', employeeSchema);


// Routes
router.post('/api/v1/user/signup', async (req, res) => {
    let {username, email, password} = req.body;

    try {

        if (!username || username === '') {
            return res.status(400).json({ status: false,
                "message": 'Username cannot be empty or just spaces' });
        }

        const existingUser = await user.findOne({username})
        if (!existingUser) {
            return res.status(400).json({ status: false, "message": 'Username taken'})}


        if (!validateEmail(email)) {
            return res.status(400).json({ status: false, "message": 'Invalid email format' });
        }

        const existingEmail = await user.findOne({email});
        if (existingEmail) {
            return res.status(400).json({ status: false, "message": 'Email already exists' });
        }

        if (password.trim.length < 6) {
            return res.status(400).json({ status: false,
                "message": 'Password must be at least 6 characters long' });
        }

        username = username.trim();
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new user({
            username,
            email,
            password: hashedPassword,
            created_at: new Date(),
            updated_at: new Date()
        });
        await newUser.save();
        res.status(201).json({
            "message": "User created successfully.",
            "user_id": newUser._id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error' });
    }
});

router.post('/api/v1/user/login', async (req, res) => {
    const {username, password} = req.body;
    try {
        const userToLogin = await user.findOne({
            $or: [{username}, {email: username}]
        });
        if (!userToLogin) {
            return res.status(400).json({ status: false, "message": 'Invalid username or password' });
        }

        const passwordMatch = await bcrypt.compare(password, userToLogin.password);
        if (!passwordMatch) {
            return res.status(400).json({ status: false, "message": 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: userToLogin._id }, JWT_SECRET, { expiresIn: '3h' });
        res.status(200).json({ "message": 'Login successful', jwt_token: token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error' });
    }
});

router.get('/api/v1/emp/employees', async (req, res) => {
    try {
        const employees = await employee.find().select('-created_at -updated_at');
        res.status(200).json(employees);

    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error'});
    }
});

router.post('/api/v1/emp/employees', async (req, res) => {
    try {
        const {first_name, last_name, email, position, salary, date_of_joining, department} = req.body;

        if (!validateEmail(email)) {
            return res.status(400).json({ status: false, "message": 'Invalid email format'});
        }

        const newEmployee = new employee({
            first_name,
            last_name,
            email,
            position,
            salary,
            date_of_joining: new Date(date_of_joining),
            department
        });
        await newEmployee.save();
        res.status(201).json({
            "message": "Employee created successfully.",
            "employee_id": newEmployee._id
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Server error'});
    }
});

router.get('/api/v1/emp/employees/:eid', async (req, res) => {
    try {
        const {eid} = req.params;
        const employeeData = await employee.findById(eid).select('-createdAt -updatedAt');

        if (!employeeData) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(employeeData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error'});
    }
});

router.put('/api/v1/emp/employees/:eid', async (req, res) => {

    try {
        const {eid} = req.params;
        const updateData = req.body;
        const employeeData = await employee.findById(eid);

        if (!employeeData) {
            return res.status(404).json({ "message": 'Employee not found' });
        }
        if (updateData.email) {
            if (!validateEmail(updateData.email)) {
                return res.status(400).json({ "message": 'Invalid email format' });
            }
            const existingEmail = await employee.findOne({ email: updateData.email });
            if (existingEmail && existingEmail._id.toString() !== eid) {
                return res.status(400).json({ "message": 'Email already in use' });
            }
        }

        Object.assign(employeeData, updateData, { updated_at: new Date() });
        await employeeData.save();
        res.status(200).json({
            "message": "Employee details updated successfully."
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error'});
    }
});

router.delete('/api/v1/emp/employees', async (req, res) => {
    const { eid } = req.query;
    try {
        const deletedEmployee = await employee.findByIdAndDelete(eid);

        if (!deletedEmployee) {
            return res.status(404).json({ "message": 'Employee not found'});
        }
        res.status(204).json({ "message": "Employee deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error'});
    }
});


app.use('/', router);

app.listen(process.env.port || 8081);

console.log('Web Server is listening at port '+ (process.env.port || 8081));