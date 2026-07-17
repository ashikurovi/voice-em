const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD 
  }
});

const sendEmergencyEmail = async (userName, lat, lng, battery, familyContacts, triggerType = 'GENERAL', authorityEmails = []) => {
  const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
  
  // Combine family contacts and any dynamic authority emails passed from the client/database
  const allRecipients = [...familyContacts, ...authorityEmails];
  
  let subjectPrefix = '🚨 EMERGENCY';
  let authorityMessage = '';

  if (triggerType === 'POLICE') {
    subjectPrefix = '🚨 POLICE DISPATCH REQUIRED';
    authorityMessage = '<h3 style="color: red;">ATTENTION POLICE: Immediate assistance requested at this location.</h3>';
  } else if (triggerType === 'FIRE_SERVICE') {
    subjectPrefix = '🚨 FIRE SERVICE REQUIRED';
    authorityMessage = '<h3 style="color: red;">ATTENTION FIRE SERVICE: Immediate fire/rescue assistance requested.</h3>';
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: allRecipients.join(','),
    subject: `${subjectPrefix}: ${userName} needs help!`,
    html: `
      <h2>Emergency Alert Triggered</h2>
      ${authorityMessage}
      <p><strong>${userName}</strong> has triggered an emergency alert.</p>
      <p><strong>Live Location:</strong> <a href="${mapLink}">View on Google Maps</a></p>
      <p><strong>Coordinates:</strong> ${lat}, ${lng}</p>
      <p><strong>Phone Battery:</strong> ${battery}%</p>
      <hr/>
      <p>Please try contacting them immediately or dispatch local authorities to the provided location.</p>
    `
  };

  if (allRecipients.length > 0) {
    await transporter.sendMail(mailOptions);
  }
};

module.exports = {
  sendEmergencyEmail
};
