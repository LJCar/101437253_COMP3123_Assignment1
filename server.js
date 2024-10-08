const express = require('express');
const app = express();
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require("express-validator");
app.use(express.json());
const JWT_SECRET = 'COMP3123_secret_key';

// Helper functions
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

// DB Connection
const MONGO_URI = 'mongodb+srv://ljcaridi:COMP3123@cluster0.o9paj.mongodb.net/' +
    'comp3123_assigment1?retryWrites=true&w=majority&appName=Cluster0';
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
    "created_at": { type: Date, default: Date.now },
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
    "created_at": { type: Date, default: Date.now },
    "updated_at": Date
})

// Models
const User = mongoose.model('User', userSchema);
const Employee = mongoose.model('Employee', employeeSchema);

// Validators
const userSignupValidation = [
    body('username').trim().notEmpty().withMessage('Username cannot be empty or just spaces'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').trim().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const userLoginValidation = [
    body('username')
        .custom((value, { req }) => {
            if (!value && !req.body.email) {
                throw new Error('Either username or email must be provided');
            }
            return true;
        }),
    body('password').notEmpty().withMessage('Password cannot be empty')
];

const employeeCreationValidation = [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('position').notEmpty().withMessage('Position is required'),
    body('salary').isNumeric().withMessage('Salary must be a number'),
    body('date_of_joining').isISO8601().withMessage('Invalid date format'),
    body('department').notEmpty().withMessage('Department is required')
];


// ROUTES

//signup
router.post('/api/v1/user/signup', userSignupValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const {username, email, password} = req.body;

    try {

        const existingUser = await User.findOne({username})
        if (existingUser) {
            return res.status(400).json({ status: false, "message": 'Username taken'})}


        if (!validateEmail(email)) {
            return res.status(400).json({ status: false, "message": 'Invalid email format' });
        }

        const existingEmail = await User.findOne({email});
        if (existingEmail) {
            return res.status(400).json({ status: false, "message": 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
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

//login
router.post('/api/v1/user/login', userLoginValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { username, email, password } = req.body;
    try {
        const userToLogin = await User.findOne({
            $or: [{username}, {email}]
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

//get all employees
router.get('/api/v1/emp/employees', async (req, res) => {
    try {
        const employees = await Employee.find().select('-created_at -updated_at');
        res.status(200).json(employees);

    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error'});
    }
});

//create new employee
router.post('/api/v1/emp/employees', async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const {first_name, last_name, email, position, salary, date_of_joining, department} = req.body;

    try {
        const existingEmail = await Employee.findOne({email});
        if (existingEmail) {
            return res.status(400).json({ status: false, "message": 'Email already exists' });
        }

        const newEmployee = new Employee({
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

//get employee info
router.get('/api/v1/emp/employees/:eid', async (req, res) => {
    try {
        const {eid} = req.params;

        if (!mongoose.Types.ObjectId.isValid(eid)) {
            return res.status(400).json({ message: 'Invalid employee ID format' });
        }

        const employeeData = await Employee.findById(eid).select('-createdAt -updatedAt');

        if (!employeeData) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.status(200).json(employeeData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error'});
    }
});

//update employee
router.put('/api/v1/emp/employees/:eid', async (req, res) => {

    try {
        const {eid} = req.params;
        const updateData = req.body;
        const employeeData = await Employee.findById(eid);

        if (!employeeData) {
            return res.status(404).json({ "message": 'Employee not found' });
        }
        if (updateData.email) {
            if (!validateEmail(updateData.email)) {
                return res.status(400).json({ "message": 'Invalid email format' });
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

//delete employee
router.delete('/api/v1/emp/employees', async (req, res) => {
    const { eid } = req.query;
    try {
        const deletedEmployee = await Employee.findByIdAndDelete(eid);

        if (!deletedEmployee) {
            return res.status(404).json({ "message": 'Employee not found'});
        }
        //with status code 204 there will not be content. The assignment requested return as JSON is not possible.
        res.status(204).json({ "message": "Employee deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ "message": 'Server error'});
    }
});


app.use('/', router);

app.listen(process.env.port || 8081);

console.log('Web Server is listening at port '+ (process.env.port || 8081));