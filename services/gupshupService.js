// src/services/gupshupService.js
const axios = require('axios');

async function sendWhatsAppOTP(phone, otp) {
  const url = `${process.env.GUPSHUP_BASE_URL}/v1/messages`;
  const payload = {
    channel: "whatsapp",
    source: process.env.GUPSHUP_SENDER_ID,
    destination: phone,
    message: `Your InvyteOnly OTP is ${otp}. It expires in 5 minutes.`
  };

  const headers = {
    'Content-Type': 'application/json',
    'apikey': process.env.GUPSHUP_API_KEY
  };

  try {
    const res = await axios.post(url, payload, { headers });
    console.log('Gupshup response:', res.data);
    return true;
  } catch (e) {
    console.error('Gupshup error:', e.response?.data || e.message);
    return false;
  }
}

module.exports = { sendWhatsAppOTP };
