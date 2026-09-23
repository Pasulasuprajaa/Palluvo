const express = require('express');
const router = express.Router();

// GET /api/pincode/check/:pincode
router.get('/check/:pincode', (req, res) => {
  const { pincode } = req.params;

  if (!pincode || !/^\d{6}$/.test(pincode.trim())) {
    return res.status(400).json({
      valid: false,
      error: 'Please enter a valid 6-digit Indian PIN code.'
    });
  }

  const cleanPin = pincode.trim();
  const firstDigit = cleanPin[0];

  // City & Region Heuristic for India
  const regionMap = {
    '1': { region: 'North India', city: 'Delhi / NCR / Punjab / Haryana', days: '2-3 Business Days', hub: 'Delhi North Hub' },
    '2': { region: 'North India', city: 'Uttar Pradesh / Uttarakhand', days: '2-3 Business Days', hub: 'Varanasi/Lucknow Hub' },
    '3': { region: 'West India', city: 'Rajasthan / Gujarat', days: '2-4 Business Days', hub: 'Ahmedabad/Jaipur Hub' },
    '4': { region: 'West India', city: 'Maharashtra / Goa / MP', days: '1-2 Business Days', hub: 'Mumbai Central Hub' },
    '5': { region: 'South India', city: 'Karnataka / Andhra / Telangana', days: '1-2 Business Days', hub: 'Bengaluru Express Hub' },
    '6': { region: 'South India', city: 'Tamil Nadu / Kerala', days: '1-2 Business Days', hub: 'Chennai South Hub' },
    '7': { region: 'East India', city: 'West Bengal / Odisha / North East', days: '3-4 Business Days', hub: 'Kolkata Hub' },
    '8': { region: 'East & Central India', city: 'Bihar / Jharkhand', days: '3-4 Business Days', hub: 'Patna Hub' }
  };

  const info = regionMap[firstDigit] || { region: 'Pan India', city: 'Major Metro / Tier 1/2', days: '2-3 Business Days', hub: 'National Express Hub' };

  res.json({
    valid: true,
    pincode: cleanPin,
    location: info.city,
    estimatedDays: info.days,
    deliveryDate: 'Delivery in ' + info.days,
    expressAvailable: true,
    freeDeliveryEligible: true,
    codAvailable: true,
    courier: 'BlueDart Luxury Express Hand-Delivery'
  });
});

module.exports = router;
