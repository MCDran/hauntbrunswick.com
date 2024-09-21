const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const crypto = require('crypto');  // For generating registration numbers
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const path = require('path');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

// MySQL connection setup
const connection = mysql.createConnection({
    host: '100.87.150.78',  // 192.168.100.100
    port: '3667',
    user: 'valak',
    password: 'SLEEP4tG',
    database: 'MYSQL_DATABASE'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.stack);
        return;
    }
    console.log('Connected to MySQL');
});

connection.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) {
        console.error('Error querying MySQL:', err.stack);
    } else {
        console.log('Test query successful, solution:', results[0].solution);
    }
});

const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
        user: 'donotreply@hauntbrunswick.com', // Your Office 365 email
        pass: 'vsjwbdbfhvqrvyqw' // Your Office 365 app password
    },
    tls: {
        rejectUnauthorized: false // This might help if there's an issue with the certificate
    }
});

async function sendRegistrationEmail(email, registrationNumber, timeSlot, names, viewUrl) {
    // Generate the QR code
    const qrCodeURL = await generateQRCode(registrationNumber, email);
    const qrCodeData = `${registrationNumber}:${email}`;
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeData);
    console.log(qrCodeURL);

    // Email content with the embedded QR code
    const emailContent = `
        <h1>Thank you for registering!</h1>
        <p>You have registered for the following time slot on <strong>Sunday, October 27th</strong>:</p>
        <p>Time Slot: ${timeSlot}</p>
        <p>Names of attendees: ${names.join(', ')}</p>
        <p>You can view your registration details at <a href="${viewUrl}">this link</a>.</p>
        <p>Use the QR code below when checking in:</p>
        <img src="cid:qrCode" alt="QR Code" />
    `;

    // Use Nodemailer to send the email (you likely have this setup already)
    const mailOptions = {
        from: 'donotreply@hauntbrunswick.com',
        to: email,
        subject: 'Your Haunted House Registration Confirmation',
        html: emailContent,
        attachments: [{
          filename: 'qrcode.png',
          content: qrCodeBuffer,
          cid: 'qrCode'  // Same CID as in the email content
        }]
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

async function generateQRCode(registrationNumber, email) {
  try {
    const qrCodeData = `${registrationNumber}:${email}`; // The data you want to encode in the QR code
    const qrCodeURL = await QRCode.toDataURL(qrCodeData); // Generates a base64 image URL
    return qrCodeURL;
  } catch (err) {
    console.error('Failed to generate QR Code', err);
    throw err;
  }
}

app.get('/checkin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/checkin/index.html'));
});

// API route to handle QR code scan data
app.post('/checkin', (req, res) => {
  const { registrationNumber, email } = req.body;

  // Lookup logic: You would fetch the registrant's details from your database here.
  // For now, let's simulate this with a simple check.

  // Simulated registrant data (replace this with actual database lookup)
  const mockRegistrant = {
    registrationNumber: '123456',
    email: 'user@example.com',
    name: 'John Doe',
    timeSlot: '7:00 PM'
  };

  // Check if the scanned data matches the mock registrant data
  if (registrationNumber === mockRegistrant.registrationNumber && email === mockRegistrant.email) {
    res.status(200).json({
      success: true,
      message: 'Registrant found!',
      registrant: mockRegistrant
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Registrant not found!'
    });
  }
});

// In-memory storage of available spots (this could also be in the database)
let availableSlots = {
    '6:00 PM': 20,
    '6:15 PM': 20,
    '6:30 PM': 20,
    '6:45 PM': 20,
    '7:00 PM': 20,
    '7:15 PM': 20,
    '7:30 PM': 20,
    '7:45 PM': 20,
    '8:00 PM': 20,
    '8:15 PM': 20,
    '8:30 PM': 20,
    '8:45 PM': 20
};

function generateRegistrationNumber() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');      // DD
    const month = String(now.getMonth() + 1).padStart(2, '0'); // MM
    const year = String(now.getFullYear()).slice(-2);        // YY
    const randomFourDigits = Math.floor(1000 + Math.random() * 9000);
    return `LC-${day}${month}${year}-${randomFourDigits}`;
}

//View registration
app.post('/view-registration', (req, res) => {
    const { registration_number, email } = req.body;

    // Query to find the registration based on registration number and email
    const sql = 'SELECT * FROM registrations WHERE registration_number = ? AND email = ?';
    connection.query(sql, [registration_number, email], (err, results) => {
        if (err || results.length === 0) {
            return res.send(`
                <head>
                    <link rel="stylesheet" href="/spooky-theme.css">
                    <title>No Registration Found</title>
                </head>
                <h1>No Registration Found</h1>
                <p>We couldn't find a registration with that number and email.</p>
                <a href="/view.html">Try again</a>
            `);
        }

        const registration = results[0];
        const namesArray = registration.names.split(', ');
        const agesArray = registration.ages.split(', ');

        let registrationDetails = `
            <head>
                <link rel="stylesheet" href="/spooky-theme.css">
                <title>Modify Registration</title>
            </head>
            <h2>Registration Details</h2>
            <p>Registration Number: ${registration.registration_number}</p>
            <p>Email: ${registration.email}</p>
            <p>Time Slot: ${registration.time_slot}</p>
            <form id="modify-form" action="/modify-registration" method="POST">
                <input type="hidden" name="registration_number" value="${registration.registration_number}">
                <input type="hidden" name="email" value="${registration.email}">
        `;

        // Generate attendee fields for modification
        namesArray.forEach((name, index) => {
            registrationDetails += `
                <div class="attendee" id="attendee-${index + 1}">
                    <label for="name${index + 1}">Name:</label>
                    <input type="text" id="name${index + 1}" name="names[]" value="${name}" required>
                    <label for="age${index + 1}">Age:</label>
                    <select id="age${index + 1}" name="ages[]" required>
                        <option value="16-20" ${agesArray[index] === '16-20' ? 'selected' : ''}>16-20</option>
                        <option value="21-30" ${agesArray[index] === '21-30' ? 'selected' : ''}>21-30</option>
                        <option value="31-40" ${agesArray[index] === '31-40' ? 'selected' : ''}>31-40</option>
                        <option value="41-50" ${agesArray[index] === '41-50' ? 'selected' : ''}>41-50</option>
                        <option value="51+" ${agesArray[index] === '51+' ? 'selected' : ''}>51+</option>
                    </select>
                    <button type="button" onclick="removeAttendee(${index + 1})">Remove</button>
                </div>
            `;
        });

        // Add "Remove All" button and submit button
        registrationDetails += `
                <button type="button" onclick="confirmRemoveAll()">Remove All</button>
                <button class="button" type="submit">Submit Changes</button>
            </form>

            <script>
                // Function to remove individual attendees
                function removeAttendee(index) {
                    const attendeeElement = document.getElementById('attendee-' + index);
                    attendeeElement.remove();
                }

                // Function to confirm removing all attendees
                function confirmRemoveAll() {
                    const attendeeElements = document.querySelectorAll('.attendee');

                    if (attendeeElements.length === 0) {
                        alert("No registrants to remove.");
                        return;
                    }

                    const confirmed = confirm("Are you sure you want to remove all registrants?");
                    if (confirmed) {
                        attendeeElements.forEach(attendee => attendee.remove());
                    }
                }
            </script>
        `;

        // Return the registration details to the user
        res.send(registrationDetails);
    });
});

app.post('/modify-registration', (req, res) => {
    const { registration_number, email, names, ages } = req.body;

    // Query to find the existing registration before making changes
    const sqlFind = 'SELECT * FROM registrations WHERE registration_number = ? AND email = ?';
    connection.query(sqlFind, [registration_number, email], (err, results) => {
        if (err || results.length === 0) {
            return res.send(`
                <head>
                    <link rel="stylesheet" href="/spooky-theme.css">
                    <title>No Registration Found</title>
                </head>
                <h1>No Registration Found</h1>
                <p>We couldn't find a registration with that number and email.</p>
                <a href="/view.html">Try again</a>
            `);
        }

        const registration = results[0];
        const existingRegistrantCount = registration.names ? registration.names.split(', ').length : 0;

        // If 'names' array is undefined or empty, delete the registration and add spots back to the time slot
        if (!names || names.length === 0) {
            const sqlDelete = 'DELETE FROM registrations WHERE registration_number = ? AND email = ?';
            connection.query(sqlDelete, [registration_number, email], (err) => {
                if (err) {
                    return res.send(`
                        <head>
                            <link rel="stylesheet" href="/spooky-theme.css">
                            <title>Removal Failed</title>
                        </head>
                        <h1>Error</h1>
                        <p>There was an issue removing your registration. Please try again later.</p>
                        <a href="/view.html">Go back</a>
                    `);
                }

                // Add back all spots when registration is removed
                const sqlUpdateSpots = 'UPDATE time_slots SET spots_remaining = spots_remaining + ? WHERE time_slot = ?';
                connection.query(sqlUpdateSpots, [existingRegistrantCount, registration.time_slot], (err) => {
                    if (err) {
                        return res.send(`
                            <head>
                                <link rel="stylesheet" href="/spooky-theme.css">
                                <title>Error Updating</title>
                            </head>
                            <h1>Error Updating Spots</h1>
                            <p>There was an issue updating the available spots for the time slot.</p>
                            <a href="/">Go back to the home page</a>
                        `);
                    }

                    res.send(`
                        <head>
                            <link rel="stylesheet" href="/spooky-theme.css">
                            <title>Registration Removed</title>
                        </head>
                        <h1>Registration Removed</h1>
                        <p>Your registration has been successfully removed.</p>
                        <a href="/">Go back to the home page</a>
                    `);
                });
            });
        } else {
            // Calculate the difference in registrant count (if any registrants were added or removed)
            const newRegistrantCount = names.length;
            const difference = existingRegistrantCount - newRegistrantCount;

            // Safeguard for undefined names or ages when joining
            const namesString = names && names.length ? names.join(', ') : '';
            const agesString = ages && ages.length ? ages.join(', ') : '';

            const sqlUpdate = `
                UPDATE registrations
                SET names = ?, ages = ?
                WHERE registration_number = ? AND email = ?
            `;

            connection.query(sqlUpdate, [namesString, agesString, registration_number, email], (err) => {
                if (err) {
                    return res.send(`
                        <head>
                            <link rel="stylesheet" href="/spooky-theme.css">
                            <title>Update Failed</title>
                        </head>
                        <h1>Update Failed</h1>
                        <p>There was an issue updating your registration. Please try again later.</p>
                        <a href="/view.html">Go back</a>
                    `);
                }

                // Update spots remaining based on the difference in registrants
                if (difference !== 0) {
                    const sqlUpdateSpots = 'UPDATE time_slots SET spots_remaining = spots_remaining + ? WHERE time_slot = ?';
                    connection.query(sqlUpdateSpots, [difference, registration.time_slot], (err) => {
                        if (err) {
                            return res.send(`
                                <head>
                                    <link rel="stylesheet" href="/spooky-theme.css">
                                    <title>Update Failed</title>
                                </head>
                                <h1>Error Updating Spots</h1>
                                <p>There was an issue updating the available spots for the time slot.</p>
                                <a href="/">Go back to the home page</a>
                            `);
                        }

                        res.send(`
                            <head>
                                <link rel="stylesheet" href="/spooky-theme.css">
                                <title>Registration Updated</title>
                            </head>
                            <h1>Registration Updated</h1>
                            <p>Your registration has been successfully updated.</p>
                            <a href="/">Go back to the home page</a>
                        `);
                    });
                } else {
                    res.send(`
                        <head>
                            <link rel="stylesheet" href="/spooky-theme.css">
                            <title>Registration Updated</title>
                        </head>
                        <h1>Registration Updated</h1>
                        <p>Your registration has been successfully updated.</p>
                        <a href="/">Go back to the home page</a>
                    `);
                }
            });
        }
    });
});

//ADMIN page
const adminPassword = 'SLEEP4tG';  // Replace with your actual password

// Middleware to protect the admin route
function checkAdminAuth(req, res, next) {
    const auth = req.headers['authorization'];

    if (!auth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('Authentication required.');
    }

    const encoded = auth.split(' ')[1];
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    if (username === 'admin' && password === adminPassword) {
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication failed.');
}

app.get('/admin', checkAdminAuth, (req, res) => {
    const sql = 'SELECT * FROM registrations ORDER BY time_slot';

    connection.query(sql, (err, results) => {
        if (err) {
            return res.send('Error retrieving registrations.');
        }

        // Create HTML table for the registrations
        let html = `
            <h1>Admin: View Registrations</h1>
            <table border="1">
                <tr>
                    <th>Registration Number</th>
                    <th>Email</th>
                    <th>Time Slot</th>
                    <th>Names</th>
                    <th>Ages</th>
                    <th>Action</th>
                </tr>
        `;

        results.forEach(registration => {
            html += `
                <tr>
                    <td>${registration.registration_number}</td>
                    <td>${registration.email}</td>
                    <td>${registration.time_slot}</td>
                    <td>${registration.names}</td>
                    <td>${registration.ages}</td>
                    <td>
                        <form action="/admin/delete" method="POST">
                            <input type="hidden" name="registration_number" value="${registration.registration_number}" />
                            <button type="submit">Remove</button>
                        </form>
                    </td>
                </tr>
            `;
        });

        html += '</table>';
        res.send(html);
    });
});

app.post('/register', async (req, res) => {
    const { email, registrationNumber, timeSlot, names, viewUrl } = req.body;

    try {
        await sendRegistrationEmail(email, registrationNumber, timeSlot, names, viewUrl);
        res.status(200).send('Registration successful, email sent.');
    } catch (error) {
        res.status(500).send('Registration successful, but email failed.');
    }
});

app.post('/admin/delete', checkAdminAuth, (req, res) => {
    const registrationNumber = req.body.registration_number;

    // Retrieve the registration details
    const sqlSelect = 'SELECT * FROM registrations WHERE registration_number = ?';

    connection.query(sqlSelect, [registrationNumber], (err, results) => {
        if (err || results.length === 0) {
            return res.send('Error finding the registration.');
        }

        const registration = results[0];
        const numberOfPeople = registration.names.split(', ').length;  // Split by comma to count names

        // Delete the registration from the database
        const sqlDelete = 'DELETE FROM registrations WHERE registration_number = ?';
        connection.query(sqlDelete, [registrationNumber], (err) => {
            if (err) {
                return res.send('Error deleting the registration.');
            }

            // Add back the number of spots to the time slot
            const sqlUpdateSpots = 'UPDATE time_slots SET spots_remaining = spots_remaining + ? WHERE time_slot = ?';
            connection.query(sqlUpdateSpots, [numberOfPeople, registration.time_slot], (err) => {
                if (err) {
                    return res.send('Error updating spots.');
                }

                res.redirect('/admin');  // Refresh the admin page after deletion
            });
        });
    });
});

// Serve the landing and registration pages
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/register.html', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.get('/spots', (req, res) => {
    const sql = 'SELECT time_slot, spots_remaining FROM time_slots';
    connection.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching available spots' });
        }
        res.json(results);
    });
});

// Handle form submission
app.post('/submit', (req, res) => {
    const { timeSlot, email, names, ages } = req.body;
    const registrationNumber = generateRegistrationNumber();

    // Step 1: Check the remaining spots from the database
    const checkSpotsSql = 'SELECT spots_remaining FROM time_slots WHERE time_slot = ?';
    connection.query(checkSpotsSql, [timeSlot], (err, results) => {
        if (err || results.length === 0) {
            console.error('Error checking spots:', err);
            return res.send(`
                <head>
                    <link rel="stylesheet" href="/spooky-theme.css">
                    <title>Registration Failed</title>
                </head>
                <h1>Registration Failed</h1>
                <p>Could not retrieve available spots. Please try again later.</p>
                <a href="/register.html">Go back</a>
            `);
        }

        const spotsRemaining = results[0].spots_remaining;

        // Step 2: Check if there are enough spots
        if (spotsRemaining < names.length) {
            return res.send(`
                <head>
                    <link rel="stylesheet" href="/spooky-theme.css">
                    <title>Registration Failed</title>
                </head>
                <h1>Registration Failed</h1>
                <p>Sorry, there aren't enough spots left for the selected time slot (${timeSlot}).</p>
                <a href="/register.html">Go back and try another slot</a>
            `);
        }

        // Step 3: Deduct the number of registered people from the available spots
        const updateSpotsSql = 'UPDATE time_slots SET spots_remaining = spots_remaining - ? WHERE time_slot = ?';
        connection.query(updateSpotsSql, [names.length, timeSlot], (err) => {
            if (err) {
                console.error('Error updating spots:', err);
                return res.send(`
                    <head>
                        <link rel="stylesheet" href="/spooky-theme.css">
                        <title>Registration Failed</title>
                    </head>
                    <h1>Registration Failed</h1>
                    <p>Could not update available spots. Please try again later.</p>
                    <a href="/register.html">Go back</a>
                `);
            }

            // Step 4: Save registration to the MySQL database
            const sql = `
                INSERT INTO registrations (registration_number, email, time_slot, names, ages)
                VALUES (?, ?, ?, ?, ?)
            `;
            const namesString = names.join(', ');
            const agesString = ages.join(', ');

            connection.query(sql, [registrationNumber, email, timeSlot, namesString, agesString], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.send(`
                        <head>
                            <link rel="stylesheet" href="/spooky-theme.css">
                            <title>Registration Failed</title>
                        </head>
                        <h1>Registration Failed</h1>
                        <p>There was an issue saving your registration. Please try again later.</p>
                        <a href="/register.html">Go back</a>
                    `);
                }

                //Send email
                const viewUrl = `https://your-domain.com/view-registration?number=${registrationNumber}`;
                sendRegistrationEmail(email, registrationNumber, timeSlot, names, viewUrl);

                // Return a confirmation
                res.send(`
                    <head>
                        <link rel="stylesheet" href="/spooky-theme.css">
                        <title>Thank you!</title>
                    </head>
                    <h1>Thank you for registering!</h1>
                    <p>You have registered ${names.length} person(s) for the ${timeSlot} time slot.</p>
                    <p>Your registration number is <strong>${registrationNumber}</strong>. Please keep this number for future reference.</p>
                    <a href="/">Go back to the home page</a>
                `);
            });
        });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
