Assignment 1 for COMP3123

This project implements CRUD operations using provided API endpoints
for Users and Employees

Example sample inputs for testing:

####signup####
{
"username": "johndoe",
"email": "johndoe@example.com",
"password": "password123"
}
####login####
{
"email": "johndoe@example.com",
"password": "password123"
}
####create_employee####
{
"first_name": "Alice",
"last_name": "Johnson",
"email": "alice.johnson@example.com",
"position": "Designer",
"salary": 85000,
"date_of_joining": "2023-08-10T00:00:00.000Z",
"department": "Design"
}
{
"first_name": "John",
"last_name": "Smith",
"email": "john.smith@example.com",
"position": "Product Manager",
"salary": 110000,
"date_of_joining": "2023-07-15T00:00:00.000Z",
"department": "Product"
}
####update_employee####
{
"position": "Senior Designer",
"salary": 95000
}

