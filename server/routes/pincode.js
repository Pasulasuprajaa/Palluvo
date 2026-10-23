const express = require('express');
const router = express.Router();

// Authoritative verified delivery offices with confirmed courier capabilities & COD availability
const VERIFIED_DELIVERY_OFFICES = {
  // Bengaluru
  '560001': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Bengaluru GPO / Central Hub', codAvailable: true, expressAvailable: true },
  '560002': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Bengaluru City Market Hub', codAvailable: true, expressAvailable: true },
  '560003': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Malleswaram Hub', codAvailable: true, expressAvailable: true },
  '560004': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Basavanagudi Hub', codAvailable: true, expressAvailable: true },
  '560008': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'HAL Air Cargo Hub', codAvailable: true, expressAvailable: true },
  '560011': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Jayanagar Hub', codAvailable: true, expressAvailable: true },
  '560025': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Richmond Town Hub', codAvailable: true, expressAvailable: true },
  '560034': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Koramangala Hub', codAvailable: true, expressAvailable: true },
  '560037': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Marathahalli Hub', codAvailable: true, expressAvailable: true },
  '560038': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Indiranagar Hub', codAvailable: true, expressAvailable: true },
  '560066': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Whitefield Tech Hub', codAvailable: true, expressAvailable: true },
  '560068': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Electronic City Hub', codAvailable: true, expressAvailable: true },
  '560076': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'BTM Layout Hub', codAvailable: true, expressAvailable: true },
  '560100': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Electronic City Phase 1 Hub', codAvailable: true, expressAvailable: true },
  '560102': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'HSR Layout Hub', codAvailable: true, expressAvailable: true },
  '560103': { city: 'Bengaluru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Bellandur Hub', codAvailable: true, expressAvailable: true },

  // Karnataka key cities
  '570001': { city: 'Mysuru', state: 'Karnataka', days: '1-2 Business Days', hub: 'Mysuru Central Hub', codAvailable: true, expressAvailable: true },
  '575001': { city: 'Mangaluru', state: 'Karnataka', days: '2-3 Business Days', hub: 'Mangaluru Port Hub', codAvailable: true, expressAvailable: true },
  '580001': { city: 'Hubballi', state: 'Karnataka', days: '2-3 Business Days', hub: 'Hubballi Hub', codAvailable: true, expressAvailable: true },

  // Hyderabad
  '500001': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Hyderabad GPO Hub', codAvailable: true, expressAvailable: true },
  '500003': { city: 'Secunderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Secunderabad Hub', codAvailable: true, expressAvailable: true },
  '500016': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Begumpet Hub', codAvailable: true, expressAvailable: true },
  '500032': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Gachibowli Tech Hub', codAvailable: true, expressAvailable: true },
  '500033': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Jubilee Hills Hub', codAvailable: true, expressAvailable: true },
  '500034': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Banjara Hills Hub', codAvailable: true, expressAvailable: true },
  '500081': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Madhapur / Hitec City Hub', codAvailable: true, expressAvailable: true },
  '500082': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Somajiguda Hub', codAvailable: true, expressAvailable: true },
  '500084': { city: 'Hyderabad', state: 'Telangana', days: '1-2 Business Days', hub: 'Kondapur Hub', codAvailable: true, expressAvailable: true },

  // Warangal (Palluvo Flagship Hub)
  '506001': { city: 'Warangal', state: 'Telangana', days: '1-2 Business Days', hub: 'Warangal Flagship Center', codAvailable: true, expressAvailable: true },
  '506002': { city: 'Hanamkonda', state: 'Telangana', days: '1-2 Business Days', hub: 'Hanamkonda Central Hub', codAvailable: true, expressAvailable: true },
  '506003': { city: 'Kazipet', state: 'Telangana', days: '1-2 Business Days', hub: 'Kazipet Railway Junction Hub', codAvailable: true, expressAvailable: true },
  '506004': { city: 'Warangal', state: 'Telangana', days: '1-2 Business Days', hub: 'NIT Warangal Campus Hub', codAvailable: true, expressAvailable: true },

  // Andhra Pradesh key cities
  '520001': { city: 'Vijayawada', state: 'Andhra Pradesh', days: '2-3 Business Days', hub: 'Vijayawada Central Hub', codAvailable: true, expressAvailable: true },
  '530001': { city: 'Visakhapatnam', state: 'Andhra Pradesh', days: '2-3 Business Days', hub: 'Vizag Central Port Hub', codAvailable: true, expressAvailable: true },
  '517501': { city: 'Tirupati', state: 'Andhra Pradesh', days: '2-3 Business Days', hub: 'Tirupati City Hub', codAvailable: true, expressAvailable: true },
  '522001': { city: 'Guntur', state: 'Andhra Pradesh', days: '2-3 Business Days', hub: 'Guntur Central Hub', codAvailable: true, expressAvailable: true },

  // Mumbai & Maharashtra
  '400001': { city: 'Mumbai', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Mumbai GPO / Fort Hub', codAvailable: true, expressAvailable: true },
  '400020': { city: 'Mumbai', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Churchgate Hub', codAvailable: true, expressAvailable: true },
  '400050': { city: 'Mumbai', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Bandra West Hub', codAvailable: true, expressAvailable: true },
  '400051': { city: 'Mumbai', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Bandra Kurla Complex (BKC) Hub', codAvailable: true, expressAvailable: true },
  '400053': { city: 'Mumbai', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Andheri West Hub', codAvailable: true, expressAvailable: true },
  '400076': { city: 'Mumbai', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Powai Tech Hub', codAvailable: true, expressAvailable: true },
  '411001': { city: 'Pune', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Pune GPO Hub', codAvailable: true, expressAvailable: true },
  '411004': { city: 'Pune', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Deccan Gymkhana Hub', codAvailable: true, expressAvailable: true },
  '411057': { city: 'Pune', state: 'Maharashtra', days: '1-2 Business Days', hub: 'Hinjawadi Infotech Hub', codAvailable: true, expressAvailable: true },
  '440001': { city: 'Nagpur', state: 'Maharashtra', days: '2-3 Business Days', hub: 'Nagpur Air Cargo Hub', codAvailable: true, expressAvailable: true },

  // Delhi NCR
  '110001': { city: 'New Delhi', state: 'Delhi', days: '2-3 Business Days', hub: 'Connaught Place / Delhi GPO Hub', codAvailable: true, expressAvailable: true },
  '110003': { city: 'New Delhi', state: 'Delhi', days: '2-3 Business Days', hub: 'Lodhi Road Hub', codAvailable: true, expressAvailable: true },
  '110016': { city: 'New Delhi', state: 'Delhi', days: '2-3 Business Days', hub: 'Hauz Khas Hub', codAvailable: true, expressAvailable: true },
  '110019': { city: 'New Delhi', state: 'Delhi', days: '2-3 Business Days', hub: 'Nehru Place Hub', codAvailable: true, expressAvailable: true },
  '110021': { city: 'New Delhi', state: 'Delhi', days: '2-3 Business Days', hub: 'Chanakyapuri Hub', codAvailable: true, expressAvailable: true },
  '122001': { city: 'Gurugram', state: 'Haryana', days: '2-3 Business Days', hub: 'Gurugram Central Hub', codAvailable: true, expressAvailable: true },
  '122002': { city: 'Gurugram', state: 'Haryana', days: '2-3 Business Days', hub: 'DLF Cyber City Hub', codAvailable: true, expressAvailable: true },
  '201301': { city: 'Noida', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Noida Express Hub', codAvailable: true, expressAvailable: true },

  // Uttarakhand & Western Uttar Pradesh
  '244001': { city: 'Moradabad', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Moradabad Central Hub', codAvailable: true, expressAvailable: true },
  '248001': { city: 'Dehradun', state: 'Uttarakhand', days: '2-3 Business Days', hub: 'Dehradun GPO Hub', codAvailable: true, expressAvailable: true },
  '247001': { city: 'Saharanpur', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Saharanpur Central Hub', codAvailable: true, expressAvailable: true },
  '249201': { city: 'Rishikesh', state: 'Uttarakhand', days: '2-3 Business Days', hub: 'Rishikesh City Hub', codAvailable: true, expressAvailable: true },
  '249401': { city: 'Haridwar', state: 'Uttarakhand', days: '2-3 Business Days', hub: 'Haridwar Central Hub', codAvailable: true, expressAvailable: true },

  // Chennai & Tamil Nadu
  '600001': { city: 'Chennai', state: 'Tamil Nadu', days: '1-2 Business Days', hub: 'Chennai GPO Hub', codAvailable: true, expressAvailable: true },
  '600004': { city: 'Chennai', state: 'Tamil Nadu', days: '1-2 Business Days', hub: 'Mylapore Heritage Hub', codAvailable: true, expressAvailable: true },
  '600017': { city: 'Chennai', state: 'Tamil Nadu', days: '1-2 Business Days', hub: 'T. Nagar Silk Hub', codAvailable: true, expressAvailable: true },
  '600096': { city: 'Chennai', state: 'Tamil Nadu', days: '1-2 Business Days', hub: 'OMR IT Corridor Hub', codAvailable: true, expressAvailable: true },
  '641001': { city: 'Coimbatore', state: 'Tamil Nadu', days: '2-3 Business Days', hub: 'Coimbatore Central Hub', codAvailable: true, expressAvailable: true },

  // Kolkata & West Bengal
  '700001': { city: 'Kolkata', state: 'West Bengal', days: '2-3 Business Days', hub: 'Kolkata GPO Hub', codAvailable: true, expressAvailable: true },
  '700016': { city: 'Kolkata', state: 'West Bengal', days: '2-3 Business Days', hub: 'Park Street Hub', codAvailable: true, expressAvailable: true },
  '700091': { city: 'Kolkata', state: 'West Bengal', days: '2-3 Business Days', hub: 'Salt Lake Sector V Hub', codAvailable: true, expressAvailable: true },

  // Gujarat & Rajasthan
  '380001': { city: 'Ahmedabad', state: 'Gujarat', days: '2-3 Business Days', hub: 'Ahmedabad GPO Hub', codAvailable: true, expressAvailable: true },
  '380015': { city: 'Ahmedabad', state: 'Gujarat', days: '2-3 Business Days', hub: 'Satellite Hub', codAvailable: true, expressAvailable: true },
  '395001': { city: 'Surat', state: 'Gujarat', days: '2-3 Business Days', hub: 'Surat Textile City Hub', codAvailable: true, expressAvailable: true },
  '302001': { city: 'Jaipur', state: 'Rajasthan', days: '2-3 Business Days', hub: 'Jaipur Heritage Hub', codAvailable: true, expressAvailable: true },
  '302015': { city: 'Jaipur', state: 'Rajasthan', days: '2-3 Business Days', hub: 'Malviya Nagar Hub', codAvailable: true, expressAvailable: true },

  // Kerala, UP, MP, Punjab, Bihar, Odisha, Assam
  '682001': { city: 'Kochi', state: 'Kerala', days: '2-3 Business Days', hub: 'Kochi Port Hub', codAvailable: true, expressAvailable: true },
  '682016': { city: 'Kochi', state: 'Kerala', days: '2-3 Business Days', hub: 'Ernakulam South Hub', codAvailable: true, expressAvailable: true },
  '226001': { city: 'Lucknow', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Lucknow Central Hub', codAvailable: true, expressAvailable: true },
  '221001': { city: 'Varanasi', state: 'Uttar Pradesh', days: '2-3 Business Days', hub: 'Varanasi Silk Hub', codAvailable: true, expressAvailable: true },
  '160017': { city: 'Chandigarh', state: 'Punjab', days: '2-3 Business Days', hub: 'Chandigarh Central Hub', codAvailable: true, expressAvailable: true },
  '452001': { city: 'Indore', state: 'Madhya Pradesh', days: '2-3 Business Days', hub: 'Indore Central Hub', codAvailable: true, expressAvailable: true },
  '751001': { city: 'Bhubaneswar', state: 'Odisha', days: '3-4 Business Days', hub: 'Bhubaneswar Central Hub', codAvailable: true, expressAvailable: true },
  '800001': { city: 'Patna', state: 'Bihar', days: '3-4 Business Days', hub: 'Patna Central Hub', codAvailable: true, expressAvailable: true },
  '781001': { city: 'Guwahati', state: 'Assam', days: '3-5 Business Days', hub: 'Guwahati Gateway Hub', codAvailable: true, expressAvailable: true }
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
  // Mixed-state prefix: 24 covers both Uttarakhand (Dehradun, Haridwar) and Western UP (Moradabad, Saharanpur)
  // State is kept unknown (null) unless resolved from an exact-PIN source
  '24': { region: 'Uttarakhand & Western UP', state: null },
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
  '79': { region: 'North Eastern States', state: null },
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

  // 1. Authoritative check of the complete 6-digit PIN against verified delivery offices
  const verifiedOffice = VERIFIED_DELIVERY_OFFICES[cleanPin];
  if (verifiedOffice) {
    const city = verifiedOffice.city;
    const state = verifiedOffice.state;
    const location = `${city}, ${state}`;
    const days = verifiedOffice.days;

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
      expressAvailable: verifiedOffice.expressAvailable,
      freeDeliveryEligible: true,
      codAvailable: verifiedOffice.codAvailable,
      courier: 'BlueDart Luxury Express Hand-Delivery',
      hub: verifiedOffice.hub
    });
  }

  // 2. Prefix-only matches are treated as estimates without claiming confirmed serviceability, COD, or express
  const prefix2 = cleanPin.substring(0, 2);
  const circle = POSTAL_CIRCLES[prefix2];

  if (circle) {
    const city = circle.region;
    const state = circle.state || null;
    const location = state ? `${city}, ${state}` : city;
    const days = '4-6 Business Days';

    return res.json({
      valid: true,
      serviceable: false,
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
      message: 'Estimated delivery timeline. Serviceability, COD, and express availability confirmed at checkout.'
    });
  }

  return res.status(400).json({
    valid: false,
    serviceable: false,
    error: 'Pincode is invalid or not serviceable.'
  });
});

module.exports = router;
