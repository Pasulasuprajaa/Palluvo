const express = require('express');
const router = express.Router();

// Authoritative verified express delivery hubs (Tier-1, Tier-2 & flagship brand hubs)
const VERIFIED_HUBS = {
  // Karnataka (Bengaluru hub & key cities)
  '560': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Bengaluru Express Hub', codAvailable: true, expressAvailable: true },
  '570': { city: 'Mysuru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Mysuru Hub', codAvailable: true, expressAvailable: true },
  '575': { city: 'Mangaluru', state: 'Karnataka', days: '2-3 Business Days', hub: 'Mangaluru Hub', codAvailable: true, expressAvailable: true },
  '580': { city: 'Hubballi', state: 'Karnataka', days: '2-3 Business Days', hub: 'Hubballi Hub', codAvailable: true, expressAvailable: true },

  // Telangana & Andhra Pradesh (Hyderabad & Warangal flagship)
  '500': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Hyderabad Air Hub', codAvailable: true, expressAvailable: true },
  '506': { city: 'Warangal', state: 'Telangana', days: '1-2 Business Days', hub: 'Warangal Flagship Center', codAvailable: true, expressAvailable: true },
  '505': { city: 'Karimnagar', state: 'Telangana', days: '2-3 Business Days', hub: 'Karimnagar Hub', codAvailable: true, expressAvailable: true },
  '520': { city: 'Vijayawada', state: 'Andhra Pradesh', days: '2-3 Business Days', hub: 'Vijayawada Hub', codAvailable: true, expressAvailable: true },
  '530': { city: 'Visakhapatnam', state: 'Andhra Pradesh', days: '2-3 Business Days', hub: 'Vizag Hub', codAvailable: true, expressAvailable: true },
  '517': { city: 'Tirupati', state: 'Andhra Pradesh', days: '2-3 Business Days', hub: 'Tirupati Hub', codAvailable: true, expressAvailable: true },
  '522': { city: 'Guntur', state: 'Andhra Pradesh', days: '2-3 Business Days', hub: 'Guntur Hub', codAvailable: true, expressAvailable: true },

  // Maharashtra & Goa
  '400': { city: 'Mumbai', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Mumbai Central Cargo Hub', codAvailable: true, expressAvailable: true },
  '411': { city: 'Pune', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Pune Express Hub', codAvailable: true, expressAvailable: true },
  '440': { city: 'Nagpur', state: 'Maharashtra', days: '2-3 Business Days', hub: 'Nagpur Air Hub', codAvailable: true, expressAvailable: true },
  '422': { city: 'Nashik', state: 'Maharashtra', days: '2-3 Business Days', hub: 'Nashik Hub', codAvailable: true, expressAvailable: true },
  '403': { city: 'Goa', state: 'Goa', days: '2-3 Business Days', hub: 'Goa Express Hub', codAvailable: true, expressAvailable: true },

  // Delhi NCR
  '110': { city: 'New Delhi', state: 'Delhi', days: '2-3 Business Days', hub: 'Delhi North Air Hub', codAvailable: true, expressAvailable: true },
  '122': { city: 'Gurugram', state: 'Haryana', days: '2-3 Business Days', hub: 'Gurugram NCR Hub', codAvailable: true, expressAvailable: true },
  '201': { city: 'Noida / Ghaziabad', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Noida Hub', codAvailable: true, expressAvailable: true },
  '121': { city: 'Faridabad', state: 'Haryana', days: '2-3 Business Days', hub: 'Faridabad Hub', codAvailable: true, expressAvailable: true },

  // Tamil Nadu & Puducherry
  '600': { city: 'Chennai', state: 'Tamil Nadu', days: '1-2 Business Days', hub: 'Chennai South Air Hub', codAvailable: true, expressAvailable: true },
  '641': { city: 'Coimbatore', state: 'Tamil Nadu', days: '2-3 Business Days', hub: 'Coimbatore Hub', codAvailable: true, expressAvailable: true },
  '625': { city: 'Madurai', state: 'Tamil Nadu', days: '2-3 Business Days', hub: 'Madurai Hub', codAvailable: true, expressAvailable: true },

  // West Bengal
  '700': { city: 'Kolkata', state: 'West Bengal', days: '2-3 Business Days', hub: 'Kolkata East Hub', codAvailable: true, expressAvailable: true },
  '711': { city: 'Howrah', state: 'West Bengal', days: '2-3 Business Days', hub: 'Howrah Hub', codAvailable: true, expressAvailable: true },

  // Gujarat
  '380': { city: 'Ahmedabad', state: 'Gujarat', days: '2-3 Business Days', hub: 'Ahmedabad Hub', codAvailable: true, expressAvailable: true },
  '395': { city: 'Surat', state: 'Gujarat', days: '2-3 Business Days', hub: 'Surat Textile Hub', codAvailable: true, expressAvailable: true },
  '390': { city: 'Vadodara', state: 'Gujarat', days: '2-3 Business Days', hub: 'Vadodara Hub', codAvailable: true, expressAvailable: true },

  // Rajasthan
  '302': { city: 'Jaipur', state: 'Rajasthan', days: '2-3 Business Days', hub: 'Jaipur Heritage Hub', codAvailable: true, expressAvailable: true },
  '342': { city: 'Jodhpur', state: 'Rajasthan', days: '2-3 Business Days', hub: 'Jodhpur Hub', codAvailable: true, expressAvailable: true },
  '313': { city: 'Udaipur', state: 'Rajasthan', days: '2-3 Business Days', hub: 'Udaipur Hub', codAvailable: true, expressAvailable: true },

  // Kerala
  '682': { city: 'Kochi', state: 'Kerala', days: '2-3 Business Days', hub: 'Kochi Port Hub', codAvailable: true, expressAvailable: true },
  '695': { city: 'Thiruvananthapuram', state: 'Kerala', days: '2-3 Business Days', hub: 'Trivandrum Hub', codAvailable: true, expressAvailable: true },

  // Uttar Pradesh & Uttarakhand
  '226': { city: 'Lucknow', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Lucknow Hub', codAvailable: true, expressAvailable: true },
  '221': { city: 'Varanasi', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Varanasi Silk Hub', codAvailable: true, expressAvailable: true },
  '208': { city: 'Kanpur', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Kanpur Hub', codAvailable: true, expressAvailable: true },
  '248': { city: 'Dehradun', state: 'Uttarakhand', days: '3-4 Business Days', hub: 'Dehradun Valley Hub', codAvailable: true, expressAvailable: true },

  // Punjab, Chandigarh, MP, Bihar, Odisha, Assam
  '160': { city: 'Chandigarh', state: 'Punjab', days: '2-3 Business Days', hub: 'Chandigarh Tri-City Hub', codAvailable: true, expressAvailable: true },
  '141': { city: 'Ludhiana', state: 'Punjab', days: '2-3 Business Days', hub: 'Ludhiana Hub', codAvailable: true, expressAvailable: true },
  '452': { city: 'Indore', state: 'Madhya Pradesh', days: '2-3 Business Days', hub: 'Indore Central Hub', codAvailable: true, expressAvailable: true },
  '462': { city: 'Bhopal', state: 'Madhya Pradesh', days: '2-3 Business Days', hub: 'Bhopal Hub', codAvailable: true, expressAvailable: true },
  '751': { city: 'Bhubaneswar', state: 'Odisha', days: '3-4 Business Days', hub: 'Bhubaneswar Hub', codAvailable: true, expressAvailable: true },
  '800': { city: 'Patna', state: 'Bihar', days: '3-4 Business Days', hub: 'Patna Hub', codAvailable: true, expressAvailable: true },
  '834': { city: 'Ranchi', state: 'Jharkhand', days: '3-4 Business Days', hub: 'Ranchi Hub', codAvailable: true, expressAvailable: true },
  '781': { city: 'Guwahati', state: 'Assam', days: '3-5 Business Days', hub: 'Guwahati Gateway Hub', codAvailable: true, expressAvailable: true }
};

// Official India Post Postal Circle 2-digit prefixes
const POSTAL_CIRCLES = {
  '11': { region: 'Delhi NCR', state: 'Delhi' },
  '12': { region: 'Haryana Circle', state: 'Haryana' },
  '13': { region: 'Haryana Circle', state: 'Haryana' },
  '14': { region: 'Punjab Circle', state: 'Punjab' },
  '15': { region: 'Punjab Circle', state: 'Punjab' },
  '16': { region: 'Chandigarh & Punjab', state: 'Punjab' },
  '17': { region: 'Himachal Pradesh Circle', state: 'Himachal Pradesh' },
  '18': { region: 'Jammu & Kashmir Circle', state: 'Jammu and Kashmir' },
  '19': { region: 'Jammu & Kashmir Circle', state: 'Jammu and Kashmir' },
  '20': { region: 'Western Uttar Pradesh', state: 'Uttar Pradesh' },
  '21': { region: 'Central Uttar Pradesh', state: 'Uttar Pradesh' },
  '22': { region: 'Eastern Uttar Pradesh', state: 'Uttar Pradesh' },
  '23': { region: 'Eastern Uttar Pradesh', state: 'Uttar Pradesh' },
  '24': { region: 'Uttarakhand & Western UP', state: 'Uttarakhand' },
  '25': { region: 'Western Uttar Pradesh', state: 'Uttar Pradesh' },
  '26': { region: 'Rohilkhand & Kumaon', state: 'Uttar Pradesh' },
  '27': { region: 'Eastern Uttar Pradesh', state: 'Uttar Pradesh' },
  '28': { region: 'Bundelkhand & Agra', state: 'Uttar Pradesh' },
  '30': { region: 'Rajasthan Circle', state: 'Rajasthan' },
  '31': { region: 'Southern Rajasthan', state: 'Rajasthan' },
  '32': { region: 'Eastern Rajasthan', state: 'Rajasthan' },
  '33': { region: 'Northern Rajasthan', state: 'Rajasthan' },
  '34': { region: 'Western Rajasthan', state: 'Rajasthan' },
  '36': { region: 'Saurashtra Circle', state: 'Gujarat' },
  '37': { region: 'Kutch Region', state: 'Gujarat' },
  '38': { region: 'North Gujarat', state: 'Gujarat' },
  '39': { region: 'South Gujarat', state: 'Gujarat' },
  '40': { region: 'Mumbai & Konkan', state: 'Maharashtra' },
  '41': { region: 'Western Maharashtra & Pune', state: 'Maharashtra' },
  '42': { region: 'Khandesh & Nashik', state: 'Maharashtra' },
  '43': { region: 'Marathwada', state: 'Maharashtra' },
  '44': { region: 'Vidarbha & Nagpur', state: 'Maharashtra' },
  '45': { region: 'Malwa & Indore', state: 'Madhya Pradesh' },
  '46': { region: 'Bhopal Region', state: 'Madhya Pradesh' },
  '47': { region: 'Gwalior Region', state: 'Madhya Pradesh' },
  '48': { region: 'Jabalpur Region', state: 'Madhya Pradesh' },
  '49': { region: 'Chhattisgarh Circle', state: 'Chhattisgarh' },
  '50': { region: 'Telangana Circle', state: 'Telangana' },
  '51': { region: 'Rayalaseema', state: 'Andhra Pradesh' },
  '52': { region: 'Coastal Andhra', state: 'Andhra Pradesh' },
  '53': { region: 'Northern Coastal Andhra', state: 'Andhra Pradesh' },
  '56': { region: 'Bengaluru & Southern Karnataka', state: 'Karnataka' },
  '57': { region: 'Coastal & Malnad Karnataka', state: 'Karnataka' },
  '58': { region: 'Northern Karnataka', state: 'Karnataka' },
  '59': { region: 'North Western Karnataka', state: 'Karnataka' },
  '60': { region: 'Chennai & Northern Tamil Nadu', state: 'Tamil Nadu' },
  '61': { region: 'Central Tamil Nadu', state: 'Tamil Nadu' },
  '62': { region: 'Southern Tamil Nadu', state: 'Tamil Nadu' },
  '63': { region: 'Western Tamil Nadu', state: 'Tamil Nadu' },
  '64': { region: 'Coimbatore & Nilgiris', state: 'Tamil Nadu' },
  '67': { region: 'Northern Kerala', state: 'Kerala' },
  '68': { region: 'Central Kerala', state: 'Kerala' },
  '69': { region: 'Southern Kerala', state: 'Kerala' },
  '70': { region: 'Kolkata Metropolitan', state: 'West Bengal' },
  '71': { region: 'Lower Bengal', state: 'West Bengal' },
  '72': { region: 'Midnapore Region', state: 'West Bengal' },
  '73': { region: 'North Bengal & Sikkim', state: 'West Bengal' },
  '74': { region: 'Presidency Division', state: 'West Bengal' },
  '75': { region: 'Eastern Odisha', state: 'Odisha' },
  '76': { region: 'Southern Odisha', state: 'Odisha' },
  '77': { region: 'Northern & Western Odisha', state: 'Odisha' },
  '78': { region: 'Assam Circle', state: 'Assam' },
  '79': { region: 'North Eastern States', state: 'North East' },
  '80': { region: 'Patna & Central Bihar', state: 'Bihar' },
  '81': { region: 'Eastern Bihar', state: 'Bihar' },
  '82': { region: 'Southern Bihar', state: 'Bihar' },
  '83': { region: 'South Jharkhand & Ranchi', state: 'Jharkhand' },
  '84': { region: 'Northern Bihar', state: 'Bihar' },
  '85': { region: 'North Eastern Bihar', state: 'Bihar' }
};

// GET /api/pincode/check/:pincode
router.get('/check/:pincode', (req, res) => {
  const { pincode } = req.params;
  const cleanPin = String(pincode || '').trim();

  // Indian PIN codes must be strictly 6 digits starting with digits 1 through 8
  // (Pincodes starting with 0 like '000000' or 9 for military APO/FPO are not civilian serviceable)
  if (!cleanPin || !/^[1-8]\d{5}$/.test(cleanPin)) {
    return res.status(400).json({
      valid: false,
      serviceable: false,
      error: 'Please enter a valid 6-digit Indian PIN code.'
    });
  }

  const prefix3 = cleanPin.substring(0, 3);
  const verifiedHub = VERIFIED_HUBS[prefix3];

  if (verifiedHub) {
    const city = verifiedHub.city;
    const state = verifiedHub.state;
    const location = `${city}, ${state}`;
    const days = verifiedHub.days;

    return res.json({
      valid: true,
      serviceable: true,
      verified: true,
      is_estimate: false,
      pincode: cleanPin,
      city,
      state,
      location,
      estimated_delivery: days,
      estimatedDays: days,
      deliveryDate: 'Delivery in ' + days,
      expressAvailable: verifiedHub.expressAvailable,
      freeDeliveryEligible: true,
      codAvailable: verifiedHub.codAvailable,
      courier: 'BlueDart Luxury Express Hand-Delivery',
      hub: verifiedHub.hub
    });
  }

  const prefix2 = cleanPin.substring(0, 2);
  const circle = POSTAL_CIRCLES[prefix2];

  if (circle) {
    const city = circle.region;
    const state = circle.state;
    const location = `${city}, ${state}`;
    const days = '4-6 Business Days';

    // Regional circle estimate without asserting verified express/COD availability
    return res.json({
      valid: true,
      serviceable: true,
      verified: false,
      is_estimate: true,
      pincode: cleanPin,
      city,
      state,
      location,
      estimated_delivery: days,
      estimatedDays: days,
      deliveryDate: 'Estimated delivery in ' + days,
      expressAvailable: false,
      freeDeliveryEligible: true,
      codAvailable: false,
      courier: 'Delhivery / Xpressbees Standard',
      message: 'Estimated delivery timeline. Final COD and express availability confirmed at checkout.'
    });
  }

  return res.status(400).json({
    valid: false,
    serviceable: false,
    error: 'Pincode is invalid or not serviceable.'
  });
});

module.exports = router;
