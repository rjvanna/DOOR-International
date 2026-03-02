// Initialize the map
const map = L.map('map', {
    minZoom: 2,
    maxZoom: 2,
    zoom: 2,
    dragging: true,
    scrollWheelZoom: true,
    zoomControl: true
}).setView([20, 0], 2);

// Placeholder data — replace with real API calls in production
const placeholderData = {
    global: {
        totalActiveCountries: 14,
        totalChurches: 30,
        totalGroups: 41,
        totalStaff: 63,
        totalVolunteers: 176,
        countries: []
    },

    // ── Country-level stats ───────────────────────────────────────────────────
    countryStats: {
        'United States': { churches: 3,  groups: 5,  staff: 8,  volunteers: 24 },
        'Kenya':         { churches: 3,  groups: 4,  staff: 6,  volunteers: 18 },
        'India':         { churches: 1,  groups: 2,  staff: 3,  volunteers: 10 },
        'Russia':        { churches: 1,  groups: 1,  staff: 2,  volunteers: 4  },
        'Nigeria':       { churches: 2,  groups: 3,  staff: 5,  volunteers: 14 },
        'Bulgaria':      { churches: 1,  groups: 1,  staff: 2,  volunteers: 6  },
        'Burundi':       { churches: 2,  groups: 2,  staff: 4,  volunteers: 9  },
        'Egypt':         { churches: 1,  groups: 2,  staff: 3,  volunteers: 7  },
        'Ethiopia':      { churches: 2,  groups: 3,  staff: 5,  volunteers: 16 },
        'Ghana':         { churches: 2,  groups: 2,  staff: 4,  volunteers: 11 },
        'Mozambique':    { churches: 1,  groups: 2,  staff: 3,  volunteers: 8  },
        'Nepal':         { churches: 2,  groups: 2,  staff: 4,  volunteers: 12 },
        'South Sudan':   { churches: 1,  groups: 1,  staff: 2,  volunteers: 5  },
        'Sri Lanka':     { churches: 2,  groups: 2,  staff: 3,  volunteers: 9  },
        'Tanzania':      { churches: 2,  groups: 3,  staff: 5,  volunteers: 13 },
        'Uganda':        { churches: 2,  groups: 2,  staff: 4,  volunteers: 10 }
    },

    // ── Regional breakdowns ───────────────────────────────────────────────────
    stateStats: {
        'United States': {
            'Kansas':     { coords: [38.9, -97.5],  churches: 1, groups: 2, staff: 3, names: ['Grace Church'] },
            'Nebraska':   { coords: [39.5, -98.0],  churches: 1, groups: 1, staff: 2, names: ['Hidden Vineyard'] },
            'Colorado':   { coords: [40.0, -100.0], churches: 1, groups: 2, staff: 3, names: ['Prairie Ministries'] }
        },
        'Kenya': {
            'Nairobi':    { coords: [-1.0, 37.9],   churches: 1, groups: 2, staff: 2, names: ['Nairobi Peace Church'] },
            'Rift Valley':{ coords: [0.0, 38.0],    churches: 1, groups: 1, staff: 2, names: ['Riverbank Fellowship'] },
            'Central':    { coords: [-0.5, 38.2],   churches: 1, groups: 1, staff: 2, names: ['Hilltop Assembly'] }
        },
        'India': {
            'Delhi NCR':  { coords: [28.6139, 77.209], churches: 1, groups: 2, staff: 3, names: ['Delhi Grace'] }
        },
        'Russia': {
            'Moscow Oblast': { coords: [55.7558, 37.617], churches: 1, groups: 1, staff: 2, names: ['Moscow Light'] }
        },
        'Nigeria': {
            'FCT Abuja':  { coords: [9.0765, 7.3986],  churches: 1, groups: 2, staff: 3, names: ['Abuja Fellowship'] },
            'Lagos':      { coords: [6.5244, 3.3792],   churches: 1, groups: 1, staff: 2, names: ['Lagos Harvest Church'] }
        },
        'Bulgaria': {
            'Sofia':      { coords: [42.6977, 23.3219], churches: 1, groups: 1, staff: 2, names: ['Sofia Church'] }
        },
        'Burundi': {
            'Bujumbura':  { coords: [-3.3869, 29.3624], churches: 1, groups: 1, staff: 2, names: ['Bujumbura Hope'] },
            'Gitega':     { coords: [-3.43, 29.93],     churches: 1, groups: 1, staff: 2, names: ['Gitega Community Church'] }
        },
        'Egypt': {
            'Cairo':      { coords: [30.0444, 31.2357], churches: 1, groups: 2, staff: 3, names: ['Cairo Light'] }
        },
        'Ethiopia': {
            'Addis Ababa':{ coords: [9.03, 38.74],     churches: 1, groups: 2, staff: 3, names: ['Addis Fellowship'] },
            'Oromia':     { coords: [8.5, 39.2],        churches: 1, groups: 1, staff: 2, names: ['Oromia New Life Church'] }
        },
        'Ghana': {
            'Greater Accra': { coords: [5.6037, -0.187], churches: 1, groups: 1, staff: 2, names: ['Accra Peace'] },
            'Ashanti':       { coords: [6.6885, -1.623], churches: 1, groups: 1, staff: 2, names: ['Kumasi Grace Church'] }
        },
        'Mozambique': {
            'Maputo':     { coords: [-25.9655, 32.5832], churches: 1, groups: 2, staff: 3, names: ['Maputo Vineyard'] }
        },
        'Nepal': {
            'Bagmati':    { coords: [27.7172, 85.324],  churches: 1, groups: 1, staff: 2, names: ['Kathmandu Church'] },
            'Gandaki':    { coords: [28.2, 83.98],       churches: 1, groups: 1, staff: 2, names: ['Pokhara Lighthouse'] }
        },
        'South Sudan': {
            'Juba':       { coords: [4.8594, 31.5713],  churches: 1, groups: 1, staff: 2, names: ['Juba Fellowship'] }
        },
        'Sri Lanka': {
            'Western':    { coords: [6.9271, 79.861],   churches: 1, groups: 1, staff: 2, names: ['Colombo Hope'] },
            'Central':    { coords: [7.295, 80.636],    churches: 1, groups: 1, staff: 1, names: ['Kandy Covenant Church'] }
        },
        'Tanzania': {
            'Dar es Salaam': { coords: [-6.163, 35.752], churches: 1, groups: 2, staff: 3, names: ['Dar es Salaam Church'] },
            'Arusha':        { coords: [-3.387, 36.682], churches: 1, groups: 1, staff: 2, names: ['Arusha Mountain Church'] }
        },
        'Uganda': {
            'Kampala':    { coords: [0.3476, 32.5825],  churches: 1, groups: 1, staff: 2, names: ['Kampala Light'] },
            'Gulu':       { coords: [2.775, 32.299],    churches: 1, groups: 1, staff: 2, names: ['Gulu Restoration Church'] }
        }
    },

    // ── Church details ────────────────────────────────────────────────────────
    churchDetails: {
        // United States
        'Grace Church': {
            yearStarted: 2010, parentChurch: null,
            siblingChurches: ['Hidden Vineyard', 'Prairie Ministries'],
            attendees: 310, leaders: ['John Smith', 'Mary Johnson']
        },
        'Hidden Vineyard': {
            yearStarted: 2015, parentChurch: 'Grace Church',
            siblingChurches: ['Prairie Ministries'],
            attendees: 185, leaders: ['David Lee']
        },
        'Prairie Ministries': {
            yearStarted: 2008, parentChurch: null,
            siblingChurches: ['Grace Church', 'Hidden Vineyard'],
            attendees: 275, leaders: ['Sarah Williams', 'James Brown']
        },
        // Kenya
        'Nairobi Peace Church': {
            yearStarted: 2012, parentChurch: null,
            siblingChurches: ['Riverbank Fellowship', 'Hilltop Assembly'],
            attendees: 420, leaders: ['Peter Mwangi', 'Grace Kipchoge']
        },
        'Riverbank Fellowship': {
            yearStarted: 2016, parentChurch: 'Nairobi Peace Church',
            siblingChurches: ['Hilltop Assembly'],
            attendees: 260, leaders: ['Samuel Otieno']
        },
        'Hilltop Assembly': {
            yearStarted: 2014, parentChurch: 'Nairobi Peace Church',
            siblingChurches: ['Riverbank Fellowship'],
            attendees: 195, leaders: ['Faith Kariuki', 'Joseph Kiplagat']
        },
        // India
        'Delhi Grace': {
            yearStarted: 2018, parentChurch: null,
            siblingChurches: [],
            attendees: 140, leaders: ['Raj Patel', 'Priya Singh']
        },
        // Russia
        'Moscow Light': {
            yearStarted: 2011, parentChurch: null,
            siblingChurches: [],
            attendees: 95, leaders: ['Alexei Volkov', 'Natasha Romanova']
        },
        // Nigeria
        'Abuja Fellowship': {
            yearStarted: 2013, parentChurch: null,
            siblingChurches: ['Lagos Harvest Church'],
            attendees: 380, leaders: ['Emeka Okafor', 'Chioma Nwosu']
        },
        'Lagos Harvest Church': {
            yearStarted: 2017, parentChurch: 'Abuja Fellowship',
            siblingChurches: ['Abuja Fellowship'],
            attendees: 520, leaders: ['Tunde Adeyemi', 'Funke Balogun']
        },
        // Bulgaria
        'Sofia Church': {
            yearStarted: 2009, parentChurch: null,
            siblingChurches: [],
            attendees: 110, leaders: ['Georgi Petrov', 'Elena Dimitrova']
        },
        // Burundi
        'Bujumbura Hope': {
            yearStarted: 2014, parentChurch: null,
            siblingChurches: ['Gitega Community Church'],
            attendees: 230, leaders: ['Jean-Pierre Nkurunziza', 'Claudine Hakizimana']
        },
        'Gitega Community Church': {
            yearStarted: 2019, parentChurch: 'Bujumbura Hope',
            siblingChurches: [],
            attendees: 145, leaders: ['Révérien Ndayishimiye']
        },
        // Egypt
        'Cairo Light': {
            yearStarted: 2016, parentChurch: null,
            siblingChurches: [],
            attendees: 175, leaders: ['Mina Girgis', 'Maryam Salib']
        },
        // Ethiopia
        'Addis Fellowship': {
            yearStarted: 2011, parentChurch: null,
            siblingChurches: ['Oromia New Life Church'],
            attendees: 495, leaders: ['Dawit Bekele', 'Tigist Haile']
        },
        'Oromia New Life Church': {
            yearStarted: 2018, parentChurch: 'Addis Fellowship',
            siblingChurches: [],
            attendees: 200, leaders: ['Girma Tadesse']
        },
        // Ghana
        'Accra Peace': {
            yearStarted: 2010, parentChurch: null,
            siblingChurches: ['Kumasi Grace Church'],
            attendees: 330, leaders: ['Kwame Mensah', 'Abena Asante']
        },
        'Kumasi Grace Church': {
            yearStarted: 2015, parentChurch: 'Accra Peace',
            siblingChurches: [],
            attendees: 210, leaders: ['Kofi Boateng']
        },
        // Mozambique
        'Maputo Vineyard': {
            yearStarted: 2013, parentChurch: null,
            siblingChurches: [],
            attendees: 280, leaders: ['Hélder Mondlane', 'Graça Sitoe']
        },
        // Nepal
        'Kathmandu Church': {
            yearStarted: 2012, parentChurch: null,
            siblingChurches: ['Pokhara Lighthouse'],
            attendees: 160, leaders: ['Binod Thapa', 'Sita Rai']
        },
        'Pokhara Lighthouse': {
            yearStarted: 2017, parentChurch: 'Kathmandu Church',
            siblingChurches: [],
            attendees: 115, leaders: ['Prakash Gurung']
        },
        // South Sudan
        'Juba Fellowship': {
            yearStarted: 2015, parentChurch: null,
            siblingChurches: [],
            attendees: 190, leaders: ['John Deng', 'Rebecca Akol']
        },
        // Sri Lanka
        'Colombo Hope': {
            yearStarted: 2014, parentChurch: null,
            siblingChurches: ['Kandy Covenant Church'],
            attendees: 245, leaders: ['Roshan Fernando', 'Priya De Silva']
        },
        'Kandy Covenant Church': {
            yearStarted: 2019, parentChurch: 'Colombo Hope',
            siblingChurches: [],
            attendees: 130, leaders: ['Nimal Perera']
        },
        // Tanzania
        'Dar es Salaam Church': {
            yearStarted: 2010, parentChurch: null,
            siblingChurches: ['Arusha Mountain Church'],
            attendees: 370, leaders: ['Emmanuel Mkapa', 'Fatuma Juma']
        },
        'Arusha Mountain Church': {
            yearStarted: 2016, parentChurch: 'Dar es Salaam Church',
            siblingChurches: [],
            attendees: 215, leaders: ['Joseph Mwenda']
        },
        // Uganda
        'Kampala Light': {
            yearStarted: 2011, parentChurch: null,
            siblingChurches: ['Gulu Restoration Church'],
            attendees: 300, leaders: ['Moses Ssekandi', 'Esther Namutebi']
        },
        'Gulu Restoration Church': {
            yearStarted: 2018, parentChurch: 'Kampala Light',
            siblingChurches: [],
            attendees: 165, leaders: ['Patrick Okello']
        }
    },

    // ── Staff details ─────────────────────────────────────────────────────────
    staffDetails: {
        // United States
        'Grace Church': [
            { name: 'John Smith',    yearJoined: 2010, age: 48, mentoredBy: null,           mentoring: ['Mary Johnson', 'David Lee'], discipleshipLevel: 4 },
            { name: 'Mary Johnson',  yearJoined: 2013, age: 39, mentoredBy: 'John Smith',    mentoring: ['Lisa Garcia'],              discipleshipLevel: 3 }
        ],
        'Hidden Vineyard': [
            { name: 'David Lee',     yearJoined: 2015, age: 34, mentoredBy: 'John Smith',    mentoring: [],                           discipleshipLevel: 2 }
        ],
        'Prairie Ministries': [
            { name: 'Sarah Williams', yearJoined: 2008, age: 52, mentoredBy: null,           mentoring: ['James Brown'],              discipleshipLevel: 4 },
            { name: 'James Brown',    yearJoined: 2011, age: 44, mentoredBy: 'Sarah Williams', mentoring: [],                         discipleshipLevel: 3 }
        ],
        // Kenya
        'Nairobi Peace Church': [
            { name: 'Peter Mwangi',   yearJoined: 2012, age: 54, mentoredBy: null,            mentoring: ['Grace Kipchoge', 'Samuel Otieno'], discipleshipLevel: 4 },
            { name: 'Grace Kipchoge', yearJoined: 2015, age: 36, mentoredBy: 'Peter Mwangi',  mentoring: [],                                  discipleshipLevel: 2 }
        ],
        'Riverbank Fellowship': [
            { name: 'Samuel Otieno',  yearJoined: 2016, age: 31, mentoredBy: 'Peter Mwangi',  mentoring: [],                           discipleshipLevel: 2 }
        ],
        'Hilltop Assembly': [
            { name: 'Faith Kariuki',  yearJoined: 2014, age: 40, mentoredBy: 'Peter Mwangi',  mentoring: ['Joseph Kiplagat'],          discipleshipLevel: 3 },
            { name: 'Joseph Kiplagat',yearJoined: 2017, age: 28, mentoredBy: 'Faith Kariuki',  mentoring: [],                          discipleshipLevel: 1 }
        ],
        // India
        'Delhi Grace': [
            { name: 'Raj Patel',     yearJoined: 2018, age: 42, mentoredBy: null,             mentoring: ['Priya Singh'],              discipleshipLevel: 3 },
            { name: 'Priya Singh',   yearJoined: 2019, age: 33, mentoredBy: 'Raj Patel',       mentoring: [],                          discipleshipLevel: 2 }
        ],
        // Russia
        'Moscow Light': [
            { name: 'Alexei Volkov',   yearJoined: 2011, age: 50, mentoredBy: null,           mentoring: ['Natasha Romanova'],         discipleshipLevel: 4 },
            { name: 'Natasha Romanova',yearJoined: 2014, age: 37, mentoredBy: 'Alexei Volkov', mentoring: [],                          discipleshipLevel: 2 }
        ],
        // Nigeria
        'Abuja Fellowship': [
            { name: 'Emeka Okafor',  yearJoined: 2013, age: 46, mentoredBy: null,             mentoring: ['Chioma Nwosu', 'Tunde Adeyemi'], discipleshipLevel: 4 },
            { name: 'Chioma Nwosu',  yearJoined: 2015, age: 35, mentoredBy: 'Emeka Okafor',   mentoring: [],                               discipleshipLevel: 2 }
        ],
        'Lagos Harvest Church': [
            { name: 'Tunde Adeyemi', yearJoined: 2017, age: 38, mentoredBy: 'Emeka Okafor',   mentoring: ['Funke Balogun'],            discipleshipLevel: 3 },
            { name: 'Funke Balogun', yearJoined: 2019, age: 30, mentoredBy: 'Tunde Adeyemi',  mentoring: [],                           discipleshipLevel: 1 }
        ],
        // Bulgaria
        'Sofia Church': [
            { name: 'Georgi Petrov',   yearJoined: 2009, age: 55, mentoredBy: null,           mentoring: ['Elena Dimitrova'],          discipleshipLevel: 4 },
            { name: 'Elena Dimitrova', yearJoined: 2012, age: 43, mentoredBy: 'Georgi Petrov', mentoring: [],                          discipleshipLevel: 3 }
        ],
        // Burundi
        'Bujumbura Hope': [
            { name: 'Jean-Pierre Nkurunziza', yearJoined: 2014, age: 47, mentoredBy: null,                       mentoring: ['Claudine Hakizimana'], discipleshipLevel: 4 },
            { name: 'Claudine Hakizimana',    yearJoined: 2016, age: 34, mentoredBy: 'Jean-Pierre Nkurunziza',   mentoring: [],                     discipleshipLevel: 2 }
        ],
        'Gitega Community Church': [
            { name: 'Révérien Ndayishimiye', yearJoined: 2019, age: 29, mentoredBy: 'Jean-Pierre Nkurunziza', mentoring: [], discipleshipLevel: 1 }
        ],
        // Egypt
        'Cairo Light': [
            { name: 'Mina Girgis',  yearJoined: 2016, age: 41, mentoredBy: null,          mentoring: ['Maryam Salib'],  discipleshipLevel: 3 },
            { name: 'Maryam Salib', yearJoined: 2018, age: 32, mentoredBy: 'Mina Girgis', mentoring: [],               discipleshipLevel: 2 }
        ],
        // Ethiopia
        'Addis Fellowship': [
            { name: 'Dawit Bekele',  yearJoined: 2011, age: 49, mentoredBy: null,            mentoring: ['Tigist Haile', 'Girma Tadesse'], discipleshipLevel: 4 },
            { name: 'Tigist Haile',  yearJoined: 2014, age: 38, mentoredBy: 'Dawit Bekele',  mentoring: [],                               discipleshipLevel: 3 }
        ],
        'Oromia New Life Church': [
            { name: 'Girma Tadesse', yearJoined: 2018, age: 33, mentoredBy: 'Dawit Bekele', mentoring: [], discipleshipLevel: 2 }
        ],
        // Ghana
        'Accra Peace': [
            { name: 'Kwame Mensah', yearJoined: 2010, age: 51, mentoredBy: null,            mentoring: ['Abena Asante', 'Kofi Boateng'], discipleshipLevel: 4 },
            { name: 'Abena Asante', yearJoined: 2013, age: 40, mentoredBy: 'Kwame Mensah',  mentoring: [],                               discipleshipLevel: 3 }
        ],
        'Kumasi Grace Church': [
            { name: 'Kofi Boateng', yearJoined: 2015, age: 36, mentoredBy: 'Kwame Mensah', mentoring: [], discipleshipLevel: 2 }
        ],
        // Mozambique
        'Maputo Vineyard': [
            { name: 'Hélder Mondlane', yearJoined: 2013, age: 45, mentoredBy: null,              mentoring: ['Graça Sitoe'], discipleshipLevel: 4 },
            { name: 'Graça Sitoe',     yearJoined: 2016, age: 35, mentoredBy: 'Hélder Mondlane', mentoring: [],              discipleshipLevel: 2 }
        ],
        // Nepal
        'Kathmandu Church': [
            { name: 'Binod Thapa', yearJoined: 2012, age: 44, mentoredBy: null,           mentoring: ['Sita Rai', 'Prakash Gurung'], discipleshipLevel: 4 },
            { name: 'Sita Rai',    yearJoined: 2015, age: 37, mentoredBy: 'Binod Thapa',  mentoring: [],                            discipleshipLevel: 2 }
        ],
        'Pokhara Lighthouse': [
            { name: 'Prakash Gurung', yearJoined: 2017, age: 30, mentoredBy: 'Binod Thapa', mentoring: [], discipleshipLevel: 2 }
        ],
        // South Sudan
        'Juba Fellowship': [
            { name: 'John Deng',    yearJoined: 2015, age: 43, mentoredBy: null,          mentoring: ['Rebecca Akol'], discipleshipLevel: 3 },
            { name: 'Rebecca Akol', yearJoined: 2017, age: 31, mentoredBy: 'John Deng',   mentoring: [],              discipleshipLevel: 2 }
        ],
        // Sri Lanka
        'Colombo Hope': [
            { name: 'Roshan Fernando', yearJoined: 2014, age: 46, mentoredBy: null,               mentoring: ['Priya De Silva', 'Nimal Perera'], discipleshipLevel: 4 },
            { name: 'Priya De Silva',  yearJoined: 2016, age: 38, mentoredBy: 'Roshan Fernando',  mentoring: [],                                 discipleshipLevel: 3 }
        ],
        'Kandy Covenant Church': [
            { name: 'Nimal Perera', yearJoined: 2019, age: 32, mentoredBy: 'Roshan Fernando', mentoring: [], discipleshipLevel: 1 }
        ],
        // Tanzania
        'Dar es Salaam Church': [
            { name: 'Emmanuel Mkapa', yearJoined: 2010, age: 50, mentoredBy: null,              mentoring: ['Fatuma Juma', 'Joseph Mwenda'], discipleshipLevel: 4 },
            { name: 'Fatuma Juma',    yearJoined: 2013, age: 39, mentoredBy: 'Emmanuel Mkapa',  mentoring: [],                               discipleshipLevel: 3 }
        ],
        'Arusha Mountain Church': [
            { name: 'Joseph Mwenda', yearJoined: 2016, age: 34, mentoredBy: 'Emmanuel Mkapa', mentoring: [], discipleshipLevel: 2 }
        ],
        // Uganda
        'Kampala Light': [
            { name: 'Moses Ssekandi',  yearJoined: 2011, age: 47, mentoredBy: null,              mentoring: ['Esther Namutebi', 'Patrick Okello'], discipleshipLevel: 4 },
            { name: 'Esther Namutebi', yearJoined: 2014, age: 36, mentoredBy: 'Moses Ssekandi',  mentoring: [],                                    discipleshipLevel: 3 }
        ],
        'Gulu Restoration Church': [
            { name: 'Patrick Okello', yearJoined: 2018, age: 31, mentoredBy: 'Moses Ssekandi', mentoring: [], discipleshipLevel: 2 }
        ]
    }
};

// Countries
const countries = [
    { name: 'United States', coords: [39.8283, -98.5795],  countryCode: 'us', level: 'L2',
      churches: [
          { coords: [38.9, -97.5],  sensitive: false, name: 'Grace Church' },
          { coords: [39.5, -98.0],  sensitive: true,  name: 'Hidden Vineyard' },
          { coords: [40.0, -100.0], sensitive: false, name: 'Prairie Ministries' }
      ]
    },
    { name: 'Kenya',       coords: [-0.0236, 37.9062],  countryCode: 'ke', level: 'L4', sensitive: true,
      churches: [
          { coords: [-1.0, 37.9], sensitive: false, name: 'Nairobi Peace Church' },
          { coords: [0.0, 38.0],  sensitive: false, name: 'Riverbank Fellowship' },
          { coords: [-0.5, 38.2], sensitive: false, name: 'Hilltop Assembly' }
      ]
    },
    { name: 'India',       coords: [20.5937, 78.9629],  countryCode: 'in', level: 'L1',
      churches: [{ coords: [28.6139, 77.2090], sensitive: false, name: 'Delhi Grace' }]
    },
    { name: 'Russia',      coords: [61.5240, 105.3188], countryCode: 'ru', level: 'inactive',
      churches: [{ coords: [55.7558, 37.6173], sensitive: false, name: 'Moscow Light' }]
    },
    { name: 'Nigeria',     coords: [9.0820, 8.6753],    countryCode: 'ng',
      churches: [
          { coords: [9.0765, 7.3986],  sensitive: false, name: 'Abuja Fellowship' },
          { coords: [6.5244, 3.3792],  sensitive: false, name: 'Lagos Harvest Church' }
      ]
    },
    { name: 'Bulgaria',    coords: [42.7339, 25.4858],  countryCode: 'bg', level: 'cancelled',
      churches: [{ coords: [42.6977, 23.3219], sensitive: false, name: 'Sofia Church' }]
    },
    { name: 'Burundi',     coords: [-3.3731, 29.9189],  countryCode: 'bi',
      churches: [
          { coords: [-3.3869, 29.3624], sensitive: false, name: 'Bujumbura Hope' },
          { coords: [-3.43, 29.93],     sensitive: false, name: 'Gitega Community Church' }
      ]
    },
    { name: 'Egypt',       coords: [26.8206, 30.8025],  countryCode: 'eg',
      churches: [{ coords: [30.0444, 31.2357], sensitive: false, name: 'Cairo Light' }]
    },
    { name: 'Ethiopia',    coords: [9.1450, 40.4897],   countryCode: 'et',
      churches: [
          { coords: [9.03, 38.74],  sensitive: false, name: 'Addis Fellowship' },
          { coords: [8.5, 39.2],    sensitive: false, name: 'Oromia New Life Church' }
      ]
    },
    { name: 'Ghana',       coords: [7.9465, -1.0232],   countryCode: 'gh',
      churches: [
          { coords: [5.6037, -0.1870], sensitive: false, name: 'Accra Peace' },
          { coords: [6.6885, -1.623],  sensitive: false, name: 'Kumasi Grace Church' }
      ]
    },
    { name: 'Mozambique',  coords: [-18.6657, 35.5296], countryCode: 'mz',
      churches: [{ coords: [-25.9655, 32.5832], sensitive: false, name: 'Maputo Vineyard' }]
    },
    { name: 'Nepal',       coords: [28.3949, 84.1240],  countryCode: 'np',
      churches: [
          { coords: [27.7172, 85.3240], sensitive: false, name: 'Kathmandu Church' },
          { coords: [28.2, 83.98],      sensitive: false, name: 'Pokhara Lighthouse' }
      ]
    },
    { name: 'South Sudan', coords: [6.8769, 31.3069],   countryCode: 'ss',
      churches: [{ coords: [4.8594, 31.5713], sensitive: false, name: 'Juba Fellowship' }]
    },
    { name: 'Sri Lanka',   coords: [7.8731, 80.7718],   countryCode: 'lk',
      churches: [
          { coords: [6.9271, 79.8612], sensitive: false, name: 'Colombo Hope' },
          { coords: [7.295, 80.636],   sensitive: false, name: 'Kandy Covenant Church' }
      ]
    },
    { name: 'Tanzania',    coords: [-6.3690, 34.8888],  countryCode: 'tz',
      churches: [
          { coords: [-6.1630, 35.7516], sensitive: false, name: 'Dar es Salaam Church' },
          { coords: [-3.387, 36.682],   sensitive: false, name: 'Arusha Mountain Church' }
      ]
    },
    { name: 'Uganda',      coords: [1.3733, 32.2903],   countryCode: 'ug',
      churches: [
          { coords: [0.3476, 32.5825], sensitive: false, name: 'Kampala Light' },
          { coords: [2.775, 32.299],   sensitive: false, name: 'Gulu Restoration Church' }
      ]
    }
];

// Ensure every country has at least one church
countries.forEach(c => {
    if (!c.churches || c.churches.length === 0) {
        c.churches = [{ coords: c.coords, sensitive: false, name: c.name + ' Church' }];
    }
});

placeholderData.global.countries = countries.map(c => c.name);

// ── Map setup ─────────────────────────────────────────────────────────────────
map.setMaxBounds([[-90, -180], [90, 180]]);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
    noWrap: true
}).addTo(map);

L.control.scale({ position: 'bottomleft' }).addTo(map);

// ── Icon helpers ──────────────────────────────────────────────────────────────
function createMarkerIcon(level, countryCode, sensitive = false) {
    const diameter = sensitive ? 70 : 50;
    const imgSize  = sensitive ? 50 : 35;
    return L.divIcon({
        html: `<div style="background:#db5729;width:${diameter}px;height:${diameter}px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.4);cursor:pointer;display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="https://flagcdn.com/h40/${countryCode}.png" style="width:${imgSize}px;height:${imgSize}px;border-radius:50%;"></div>`,
        iconSize: [diameter, diameter],
        iconAnchor: [diameter / 2, diameter / 2],
        className: 'custom-marker'
    });
}

function createDotIcon(countryCode, diameter = 32) {
    const flagSize = diameter - 8;
    return L.divIcon({
        html: `<div style="background:#db5729;width:${diameter}px;height:${diameter}px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="https://flagcdn.com/h40/${countryCode}.png" style="width:${flagSize}px;height:${flagSize}px;border-radius:50%;"></div>`,
        iconSize: [diameter, diameter],
        iconAnchor: [diameter / 2, diameter / 2],
        className: 'custom-dot'
    });
}

// ── Sidebar helpers ───────────────────────────────────────────────────────────
const sidebar        = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebarContent');
const closeBtn       = document.getElementById('closeSidebar');

function openSidebar(html) {
    sidebarContent.innerHTML = html;
    sidebar.classList.add('open');
}

closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
    showAllCountries();
    churchMarkers.clearLayers();
});

map.on('click', () => {
    sidebar.classList.remove('open');
    showAllCountries();
    churchMarkers.clearLayers();
});

function setupToggles(container) {
    if (!container) return;
    container.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const el = container.querySelector('#' + btn.dataset.target);
            if (!el) return;
            const isOpen = el.style.display !== 'none';
            el.style.display = isOpen ? 'none' : 'block';
            btn.textContent  = (isOpen ? '▶ ' : '▼ ') + btn.dataset.label;
        });
    });
}

// ── Church sidebar builder ────────────────────────────────────────────────────
function buildChurchSidebar(ch, countryCode) {
    const details = placeholderData.churchDetails[ch.name] || {};
    const staff   = placeholderData.staffDetails[ch.name]  || [];

    let html = `
        <div class="sb-header">
          <img src="https://flagcdn.com/h30/${countryCode}.png" class="flag-icon" alt="flag">
          <h2>${ch.name}</h2>
        </div>
        <hr>`;

    // Church info section
    html += `<button class="toggle-btn" data-target="church-info" data-label="Church Info">▼ Church Info</button>
             <div id="church-info" class="toggle-content">`;

    if (details.yearStarted) {
        html += `<p><span class="label">Year started</span><span class="value">${details.yearStarted}</span></p>`;
    }
    if (details.attendees) {
        html += `<p><span class="label">Attendees</span><span class="value">${details.attendees}</span></p>`;
    }
    if (details.leaders && details.leaders.length) {
        html += `<p><span class="label">Leaders</span><span class="value">${details.leaders.join(', ')}</span></p>`;
    }
    if (details.parentChurch) {
        html += `<p><span class="label">Parent church</span><span class="value">${details.parentChurch}</span></p>`;
    }
    if (details.siblingChurches && details.siblingChurches.length) {
        html += `<p><span class="label">Sibling churches</span><span class="value">${details.siblingChurches.join(', ')}</span></p>`;
    }
    if (!details.yearStarted && !details.attendees) {
        html += `<p class="no-data">No details on record yet.</p>`;
    }
    html += `</div>`;

    // Staff section
    html += `<button class="toggle-btn" data-target="staff-info" data-label="Staff (${staff.length})">▼ Staff (${staff.length})</button>
             <div id="staff-info" class="toggle-content">`;

    if (staff.length) {
        staff.forEach(s => {
            const lvlPct = Math.round((s.discipleshipLevel / 4) * 100);
            html += `
                <div class="staff-card">
                  <p class="staff-name">${s.name}</p>
                  <p><span class="label">Year joined</span><span class="value">${s.yearJoined}</span></p>
                  ${s.age ? `<p><span class="label">Age</span><span class="value">${s.age}</span></p>` : ''}
                  <p><span class="label">Mentored by</span><span class="value">${s.mentoredBy || 'None'}</span></p>
                  ${s.mentoring && s.mentoring.length ? `<p><span class="label">Mentoring</span><span class="value">${s.mentoring.join(', ')}</span></p>` : ''}
                  <p><span class="label">Discipleship</span>
                    <span class="value disc-bar-wrap">
                      <span class="disc-bar" style="width:${lvlPct}%"></span>
                      <span class="disc-label">${s.discipleshipLevel}/4</span>
                    </span>
                  </p>
                </div>`;
        });
    } else {
        html += `<p class="no-data">No staff on record yet.</p>`;
    }
    html += `</div>`;

    return html;
}

// ── Country sidebar builder ───────────────────────────────────────────────────
function buildCountrySidebar(country) {
    const stats            = placeholderData.countryStats[country.name] || { churches: 0, groups: 0, staff: 0, volunteers: 0 };
    const statesForCountry = placeholderData.stateStats[country.name];

    let html = `
        <div class="sb-header">
          <img src="https://flagcdn.com/h30/${country.countryCode}.png" class="flag-icon" alt="${country.name} flag">
          <h2>${country.name}</h2>
        </div>
        <hr>
        <div class="stat-grid">
          <div class="stat-cell"><span class="stat-num">${stats.churches}</span><span class="stat-lbl">Churches</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.groups}</span><span class="stat-lbl">Groups</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.staff}</span><span class="stat-lbl">Staff</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.volunteers || 0}</span><span class="stat-lbl">Volunteers</span></div>
        </div>`;

    if (statesForCountry) {
        html += `<hr>
                 <button class="toggle-btn" data-target="state-breakdown" data-label="Regional Breakdown">▼ Regional Breakdown</button>
                 <div id="state-breakdown" class="toggle-content">
                   <ul class="state-list">`;
        for (const [stName, stData] of Object.entries(statesForCountry)) {
            html += `<li>
                       <strong>${stName}</strong>
                       <span>${stData.churches} churches · ${stData.groups} groups · ${stData.staff} staff</span>
                       <small>${stData.names.join(', ')}</small>
                     </li>`;
        }
        html += `</ul></div>`;
    }

    return html;
}

// ── Layer groups ──────────────────────────────────────────────────────────────
const churchMarkers  = L.layerGroup().addTo(map);
const stateMarkers   = L.layerGroup().addTo(map);
const countryMarkers = L.layerGroup().addTo(map);

// ── Country marker handlers ───────────────────────────────────────────────────
function setupCountryMarkerHandlers(marker, country) {
    marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        map.setMaxZoom(8);
        countryMarkers.clearLayers();

        // Zoom to fit country + churches
        const coords = [country.coords, ...country.churches.map(ch => ch.coords)];
        const statesForCountry = placeholderData.stateStats[country.name];
        if (statesForCountry) {
            Object.values(statesForCountry).forEach(st => { if (st.coords) coords.push(st.coords); });
        }
        map.fitBounds(L.latLngBounds(coords), { padding: [50, 50], animate: true });

        // Church pins
        churchMarkers.clearLayers();
        country.churches.forEach(ch => {
            const size = ch.sensitive ? 40 : 32;
            const m    = L.marker(ch.coords, { icon: createDotIcon(country.countryCode, size), title: ch.name });
            m.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                openSidebar(buildChurchSidebar(ch, country.countryCode));
                setupToggles(sidebarContent);
            });
            m.addTo(churchMarkers);
        });

        // State pins
        stateMarkers.clearLayers();
        if (statesForCountry) {
            Object.entries(statesForCountry).forEach(([stName, stData]) => {
                const pos = stData.coords || country.coords;
                const m   = L.marker(pos, { icon: createDotIcon(country.countryCode, 28), title: stName });
                m.bindPopup(`<strong>${stName}</strong><br>${stData.churches} churches · ${stData.groups} groups · ${stData.staff} staff`);
                m.addTo(stateMarkers);
            });
        }

        openSidebar(buildCountrySidebar(country));
        setupToggles(sidebarContent);
    });
}

function showAllCountries() {
    map.setMaxZoom(2);
    countryMarkers.clearLayers();
    churchMarkers.clearLayers();
    stateMarkers.clearLayers();

    countries.forEach(c => {
        const m = L.marker(c.coords, {
            icon: createMarkerIcon(c.level, c.countryCode, c.sensitive),
            title: c.name
        });
        m.addTo(countryMarkers);
        setupCountryMarkerHandlers(m, c);
    });
}

showAllCountries();

// ── Global overview modal ─────────────────────────────────────────────────────
const globalOverviewModal = document.getElementById('globalOverviewModal');
const globalOverviewBtn   = document.getElementById('globalOverviewBtn');
const modalClose          = document.querySelector('.modal-close');

globalOverviewBtn.addEventListener('click', () => { globalOverviewModal.style.display = 'block'; });
modalClose.addEventListener('click',        () => { globalOverviewModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target === globalOverviewModal) globalOverviewModal.style.display = 'none';
});

function renderGlobalDashboard() {
    const active = countries.filter(c => !['inactive', 'cancelled'].includes((c.level || '').toLowerCase()));
    document.getElementById('totalCountries').textContent = active.length;

    const list = document.getElementById('countryList');
    list.innerHTML = active.map(c => `<li>${c.name}</li>`).join('');

    let totChurches = 0, totGroups = 0, totStaff = 0, totVols = 0;
    Object.values(placeholderData.countryStats).forEach(s => {
        totChurches += s.churches   || 0;
        totGroups   += s.groups     || 0;
        totStaff    += s.staff      || 0;
        totVols     += s.volunteers || 0;
    });
    document.getElementById('totalChurches').textContent   = totChurches;
    document.getElementById('totalGroups').textContent     = totGroups;
    document.getElementById('totalStaff').textContent      = totStaff;
    document.getElementById('totalVolunteers').textContent = totVols;
}

const toggleBtn = document.getElementById('toggleCountryList');
if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
        const listEl    = document.getElementById('countryList');
        const isVisible = listEl.style.display !== 'none' && listEl.style.display !== '';
        listEl.style.display = isVisible ? 'none' : 'block';
        e.target.textContent = isVisible ? 'Show list' : 'Hide list';
    });
}

renderGlobalDashboard();
console.log('World map loaded — ' + countries.length + ' countries');