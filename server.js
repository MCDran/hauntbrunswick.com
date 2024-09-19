const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));  // Serve static files from the "public" directory

// Serve the landing page and registration page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/register.html', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

// Handle form submission
app.post('/submit', (req, res) => {
    const { name, email, timeSlot } = req.body;

    // Here you would add code to save the registration to a database
    console.log(`New registration: ${name}, ${email}, Time Slot: ${timeSlot}`);

    res.send(`
        <h1>Thank you for registering!</h1>
        <p>You have registered for the ${timeSlot} time slot.</p>
        <a href="/">Go back to the home page</a>
    `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
