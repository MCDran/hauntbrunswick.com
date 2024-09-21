const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: 'donotreply@hauntbrunswick.com',
    pass: 'vsjwbdbfhvqrvyqw'
  },
  tls: {
    rejectUnauthorized: false
  }
});

const mailOptions = {
  from: 'donotreply@hauntbrunswick.com',
  to: '696969ik@gmail.com',
  subject: 'Test Email',
  text: 'This is a test email to verify the app password.'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
