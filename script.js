// ── Map init ──────────────────────────────────────────────────────────────────
const map = L.map('map', {
    minZoom: 2, maxZoom: 12, zoom: 2,
    dragging: true, scrollWheelZoom: true, zoomControl: true
}).setView([20, 0], 2);

map.setMaxBounds([[-90, -180], [90, 180]]);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors', noWrap: true
}).addTo(map);

L.control.scale({ position: 'bottomleft' }).addTo(map);

// ── FULL Data ─────────────────────────────────────────────────────────────────
const placeholderData = {
    global: { totalActiveCountries: 14, totalChurches: 30, totalGroups: 41, totalStaff: 63, totalVolunteers: 176, countries: [] },
    countryStats: {
        'United States': { churches: 3, groups: 5, staff: 8,  volunteers: 24 },
        'Kenya':         { churches: 3, groups: 4, staff: 6,  volunteers: 18 },
        'India':         { churches: 1, groups: 2, staff: 3,  volunteers: 10 },
        'Russia':        { churches: 1, groups: 1, staff: 2,  volunteers: 4  },
        'Nigeria':       { churches: 2, groups: 3, staff: 5,  volunteers: 14 },
        'Bulgaria':      { churches: 1, groups: 1, staff: 2,  volunteers: 6  },
        'Burundi':       { churches: 2, groups: 2, staff: 4,  volunteers: 9  },
        'Egypt':         { churches: 1, groups: 2, staff: 3,  volunteers: 7  },
        'Ethiopia':      { churches: 2, groups: 3, staff: 5,  volunteers: 16 },
        'Ghana':         { churches: 2, groups: 2, staff: 4,  volunteers: 11 },
        'Mozambique':    { churches: 1, groups: 2, staff: 3,  volunteers: 8  },
        'Nepal':         { churches: 2, groups: 2, staff: 4,  volunteers: 12 },
        'South Sudan':   { churches: 1, groups: 1, staff: 2,  volunteers: 5  },
        'Sri Lanka':     { churches: 2, groups: 2, staff: 3,  volunteers: 9  },
        'Tanzania':      { churches: 2, groups: 3, staff: 5,  volunteers: 13 },
        'Uganda':        { churches: 2, groups: 2, staff: 4,  volunteers: 10 }
    },
    stateStats: {
        'United States': {
            'Kansas':        { coords: [38.9,    -97.5],    churches: 1, groups: 2, staff: 3, names: ['Grace Church'] },
            'Nebraska':      { coords: [39.5,    -98.0],    churches: 1, groups: 1, staff: 2, names: ['Hidden Vineyard'] },
            'Colorado':      { coords: [40.0,   -100.0],    churches: 1, groups: 2, staff: 3, names: ['Prairie Ministries'] }
        },
        'Kenya': {
            'Nairobi':       { coords: [-1.0,    37.9],     churches: 1, groups: 2, staff: 2, names: ['Nairobi Peace Church'] },
            'Rift Valley':   { coords: [0.0,     38.0],     churches: 1, groups: 1, staff: 2, names: ['Riverbank Fellowship'] },
            'Central':       { coords: [-0.5,    38.2],     churches: 1, groups: 1, staff: 2, names: ['Hilltop Assembly'] }
        },
        'India':       { 'Delhi NCR':     { coords: [28.6139,  77.209],   churches: 1, groups: 2, staff: 3, names: ['Delhi Grace'] } },
        'Russia':      { 'Moscow Oblast': { coords: [55.7558,  37.617],   churches: 1, groups: 1, staff: 2, names: ['Moscow Light'] } },
        'Nigeria': {
            'FCT Abuja':     { coords: [9.0765,   7.3986],  churches: 1, groups: 2, staff: 3, names: ['Abuja Fellowship'] },
            'Lagos':         { coords: [6.5244,   3.3792],  churches: 1, groups: 1, staff: 2, names: ['Lagos Harvest Church'] }
        },
        'Bulgaria':    { 'Sofia':         { coords: [42.6977,  23.3219],  churches: 1, groups: 1, staff: 2, names: ['Sofia Church'] } },
        'Burundi': {
            'Bujumbura':     { coords: [-3.3869,  29.3624], churches: 1, groups: 1, staff: 2, names: ['Bujumbura Hope'] },
            'Gitega':        { coords: [-3.43,    29.93],   churches: 1, groups: 1, staff: 2, names: ['Gitega Community Church'] }
        },
        'Egypt':       { 'Cairo':         { coords: [30.0444,  31.2357],  churches: 1, groups: 2, staff: 3, names: ['Cairo Light'] } },
        'Ethiopia': {
            'Addis Ababa':   { coords: [9.03,     38.74],   churches: 1, groups: 2, staff: 3, names: ['Addis Fellowship'] },
            'Oromia':        { coords: [8.5,      39.2],    churches: 1, groups: 1, staff: 2, names: ['Oromia New Life Church'] }
        },
        'Ghana': {
            'Greater Accra': { coords: [5.6037,  -0.187],   churches: 1, groups: 1, staff: 2, names: ['Accra Peace'] },
            'Ashanti':       { coords: [6.6885,  -1.623],   churches: 1, groups: 1, staff: 2, names: ['Kumasi Grace Church'] }
        },
        'Mozambique':  { 'Maputo':        { coords: [-25.9655, 32.5832],  churches: 1, groups: 2, staff: 3, names: ['Maputo Vineyard'] } },
        'Nepal': {
            'Bagmati':       { coords: [27.7172,  85.324],  churches: 1, groups: 1, staff: 2, names: ['Kathmandu Church'] },
            'Gandaki':       { coords: [28.2,     83.98],   churches: 1, groups: 1, staff: 2, names: ['Pokhara Lighthouse'] }
        },
        'South Sudan': { 'Juba':          { coords: [4.8594,   31.5713],  churches: 1, groups: 1, staff: 2, names: ['Juba Fellowship'] } },
        'Sri Lanka': {
            'Western':       { coords: [6.9271,   79.861],  churches: 1, groups: 1, staff: 2, names: ['Colombo Hope'] },
            'Central':       { coords: [7.295,    80.636],  churches: 1, groups: 1, staff: 1, names: ['Kandy Covenant Church'] }
        },
        'Tanzania': {
            'Dar es Salaam': { coords: [-6.163,   35.752],  churches: 1, groups: 2, staff: 3, names: ['Dar es Salaam Church'] },
            'Arusha':        { coords: [-3.387,   36.682],  churches: 1, groups: 1, staff: 2, names: ['Arusha Mountain Church'] }
        },
        'Uganda': {
            'Kampala':       { coords: [0.3476,   32.5825], churches: 1, groups: 1, staff: 2, names: ['Kampala Light'] },
            'Gulu':          { coords: [2.775,    32.299],  churches: 1, groups: 1, staff: 2, names: ['Gulu Restoration Church'] }
        }
    },
    churchDetails: {
        'Grace Church':           { yearStarted: 2010, parentChurch: null,                   siblingChurches: ['Hidden Vineyard','Prairie Ministries'],       attendees: 310, leaders: ['John Smith','Mary Johnson'] },
        'Hidden Vineyard':        { yearStarted: 2015, parentChurch: 'Grace Church',          siblingChurches: ['Prairie Ministries'],                         attendees: 185, leaders: ['David Lee'] },
        'Prairie Ministries':     { yearStarted: 2008, parentChurch: null,                   siblingChurches: ['Grace Church','Hidden Vineyard'],              attendees: 275, leaders: ['Sarah Williams','James Brown'] },
        'Nairobi Peace Church':   { yearStarted: 2012, parentChurch: null,                   siblingChurches: ['Riverbank Fellowship','Hilltop Assembly'],     attendees: 420, leaders: ['Peter Mwangi','Grace Kipchoge'] },
        'Riverbank Fellowship':   { yearStarted: 2016, parentChurch: 'Nairobi Peace Church', siblingChurches: ['Hilltop Assembly'],                            attendees: 260, leaders: ['Samuel Otieno'] },
        'Hilltop Assembly':       { yearStarted: 2014, parentChurch: 'Nairobi Peace Church', siblingChurches: ['Riverbank Fellowship'],                        attendees: 195, leaders: ['Faith Kariuki','Joseph Kiplagat'] },
        'Delhi Grace':            { yearStarted: 2018, parentChurch: null, siblingChurches: [], attendees: 140, leaders: ['Raj Patel','Priya Singh'] },
        'Moscow Light':           { yearStarted: 2011, parentChurch: null, siblingChurches: [], attendees: 95,  leaders: ['Alexei Volkov','Natasha Romanova'] },
        'Abuja Fellowship':       { yearStarted: 2013, parentChurch: null,                   siblingChurches: ['Lagos Harvest Church'],                        attendees: 380, leaders: ['Emeka Okafor','Chioma Nwosu'] },
        'Lagos Harvest Church':   { yearStarted: 2017, parentChurch: 'Abuja Fellowship',     siblingChurches: ['Abuja Fellowship'],                            attendees: 520, leaders: ['Tunde Adeyemi','Funke Balogun'] },
        'Sofia Church':           { yearStarted: 2009, parentChurch: null, siblingChurches: [], attendees: 110, leaders: ['Georgi Petrov','Elena Dimitrova'] },
        'Bujumbura Hope':         { yearStarted: 2014, parentChurch: null,                   siblingChurches: ['Gitega Community Church'],                     attendees: 230, leaders: ['Jean-Pierre Nkurunziza','Claudine Hakizimana'] },
        'Gitega Community Church':{ yearStarted: 2019, parentChurch: 'Bujumbura Hope',       siblingChurches: [],                                              attendees: 145, leaders: ['Reverie Ndayishimiye'] },
        'Cairo Light':            { yearStarted: 2016, parentChurch: null, siblingChurches: [], attendees: 175, leaders: ['Mina Girgis','Maryam Salib'] },
        'Addis Fellowship':       { yearStarted: 2011, parentChurch: null,                   siblingChurches: ['Oromia New Life Church'],                      attendees: 495, leaders: ['Dawit Bekele','Tigist Haile'] },
        'Oromia New Life Church': { yearStarted: 2018, parentChurch: 'Addis Fellowship',     siblingChurches: [],                                              attendees: 200, leaders: ['Girma Tadesse'] },
        'Accra Peace':            { yearStarted: 2010, parentChurch: null,                   siblingChurches: ['Kumasi Grace Church'],                         attendees: 330, leaders: ['Kwame Mensah','Abena Asante'] },
        'Kumasi Grace Church':    { yearStarted: 2015, parentChurch: 'Accra Peace',          siblingChurches: [],                                              attendees: 210, leaders: ['Kofi Boateng'] },
        'Maputo Vineyard':        { yearStarted: 2013, parentChurch: null, siblingChurches: [], attendees: 280, leaders: ['Helder Mondlane','Graca Sitoe'] },
        'Kathmandu Church':       { yearStarted: 2012, parentChurch: null,                   siblingChurches: ['Pokhara Lighthouse'],                          attendees: 160, leaders: ['Binod Thapa','Sita Rai'] },
        'Pokhara Lighthouse':     { yearStarted: 2017, parentChurch: 'Kathmandu Church',     siblingChurches: [],                                              attendees: 115, leaders: ['Prakash Gurung'] },
        'Juba Fellowship':        { yearStarted: 2015, parentChurch: null, siblingChurches: [], attendees: 190, leaders: ['John Deng','Rebecca Akol'] },
        'Colombo Hope':           { yearStarted: 2014, parentChurch: null,                   siblingChurches: ['Kandy Covenant Church'],                       attendees: 245, leaders: ['Roshan Fernando','Priya De Silva'] },
        'Kandy Covenant Church':  { yearStarted: 2019, parentChurch: 'Colombo Hope',         siblingChurches: [],                                              attendees: 130, leaders: ['Nimal Perera'] },
        'Dar es Salaam Church':   { yearStarted: 2010, parentChurch: null,                   siblingChurches: ['Arusha Mountain Church'],                      attendees: 370, leaders: ['Emmanuel Mkapa','Fatuma Juma'] },
        'Arusha Mountain Church': { yearStarted: 2016, parentChurch: 'Dar es Salaam Church', siblingChurches: [],                                              attendees: 215, leaders: ['Joseph Mwenda'] },
        'Kampala Light':          { yearStarted: 2011, parentChurch: null,                   siblingChurches: ['Gulu Restoration Church'],                     attendees: 300, leaders: ['Moses Ssekandi','Esther Namutebi'] },
        'Gulu Restoration Church':[ { name: 'Patrick Okello',         yearJoined: 2018, parentChurch: 'Kampala Light',        siblingChurches: [],                                              attendees: 165, leaders: ['Patrick Okello'] } ]
    },
    staffDetails: {
        'Grace Church':           [ { name: 'John Smith',             yearJoined: 2010, age: 48, mentoredBy: null,                     mentoring: ['Mary Johnson','David Lee'],          discipleshipLevel: 4 },
                                    { name: 'Mary Johnson',           yearJoined: 2013, age: 39, mentoredBy: 'John Smith',              mentoring: ['Lisa Garcia'],                       discipleshipLevel: 3 } ],
        'Hidden Vineyard':        [ { name: 'David Lee',              yearJoined: 2015, age: 34, mentoredBy: 'John Smith',              mentoring: [],                                    discipleshipLevel: 2 } ],
        'Prairie Ministries':     [ { name: 'Sarah Williams',         yearJoined: 2008, age: 52, mentoredBy: null,                     mentoring: ['James Brown'],                       discipleshipLevel: 4 },
                                    { name: 'James Brown',            yearJoined: 2011, age: 44, mentoredBy: 'Sarah Williams',          mentoring: [],                                    discipleshipLevel: 3 } ],
        'Nairobi Peace Church':   [ { name: 'Peter Mwangi',           yearJoined: 2012, age: 54, mentoredBy: null,                     mentoring: ['Grace Kipchoge','Samuel Otieno'],    discipleshipLevel: 4 },
                                    { name: 'Grace Kipchoge',         yearJoined: 2015, age: 36, mentoredBy: 'Peter Mwangi',            mentoring: [],                                    discipleshipLevel: 2 } ],
        'Riverbank Fellowship':   [ { name: 'Samuel Otieno',          yearJoined: 2016, age: 31, mentoredBy: 'Peter Mwangi',            mentoring: [],                                    discipleshipLevel: 2 } ],
        'Hilltop Assembly':       [ { name: 'Faith Kariuki',          yearJoined: 2014, age: 40, mentoredBy: 'Peter Mwangi',            mentoring: ['Joseph Kiplagat'],                   discipleshipLevel: 3 },
                                    { name: 'Joseph Kiplagat',        yearJoined: 2017, age: 28, mentoredBy: 'Faith Kariuki',           mentoring: [],                                    discipleshipLevel: 1 } ],
        'Delhi Grace':            [ { name: 'Raj Patel',              yearJoined: 2018, age: 42, mentoredBy: null,                     mentoring: ['Priya Singh'],                       discipleshipLevel: 3 },
                                    { name: 'Priya Singh',            yearJoined: 2019, age: 33, mentoredBy: 'Raj Patel',               mentoring: [],                                    discipleshipLevel: 2 } ],
        'Moscow Light':           [ { name: 'Alexei Volkov',          yearJoined: 2011, age: 50, mentoredBy: null,                     mentoring: ['Natasha Romanova'],                  discipleshipLevel: 4 },
                                    { name: 'Natasha Romanova',       yearJoined: 2014, age: 37, mentoredBy: 'Alexei Volkov',           mentoring: [],                                    discipleshipLevel: 2 } ],
        'Abuja Fellowship':       [ { name: 'Emeka Okafor',           yearJoined: 2013, age: 46, mentoredBy: null,                     mentoring: ['Chioma Nwosu','Tunde Adeyemi'],      discipleshipLevel: 4 },
                                    { name: 'Chioma Nwosu',           yearJoined: 2015, age: 35, mentoredBy: 'Emeka Okafor',            mentoring: [],                                    discipleshipLevel: 2 } ],
        'Lagos Harvest Church':   [ { name: 'Tunde Adeyemi',          yearJoined: 2017, age: 38, mentoredBy: 'Emeka Okafor',            mentoring: ['Funke Balogun'],                     discipleshipLevel: 3 },
                                    { name: 'Funke Balogun',          yearJoined: 2019, age: 30, mentoredBy: 'Tunde Adeyemi',           mentoring: [],                                    discipleshipLevel: 1 } ],
        'Sofia Church':           [ { name: 'Georgi Petrov',          yearJoined: 2009, age: 55, mentoredBy: null,                     mentoring: ['Elena Dimitrova'],                   discipleshipLevel: 4 },
                                    { name: 'Elena Dimitrova',        yearJoined: 2012, age: 43, mentoredBy: 'Georgi Petrov',           mentoring: [],                                    discipleshipLevel: 3 } ],
        'Bujumbura Hope':         [ { name: 'Jean-Pierre Nkurunziza', yearJoined: 2014, age: 47, mentoredBy: null,                     mentoring: ['Claudine Hakizimana'],               discipleshipLevel: 4 },
                                    { name: 'Claudine Hakizimana',    yearJoined: 2016, age: 34, mentoredBy: 'Jean-Pierre Nkurunziza', mentoring: [],                                    discipleshipLevel: 2 } ],
        'Gitega Community Church':[ { name: 'Reverie Ndayishimiye',   yearJoined: 2019, age: 29, mentoredBy: 'Jean-Pierre Nkurunziza', mentoring: [],                                    discipleshipLevel: 1 } ],
        'Cairo Light':            [ { name: 'Mina Girgis',            yearJoined: 2016, age: 41, mentoredBy: null,                     mentoring: ['Maryam Salib'],                      discipleshipLevel: 3 },
                                    { name: 'Maryam Salib',           yearJoined: 2018, age: 32, mentoredBy: 'Mina Girgis',             mentoring: [],                                    discipleshipLevel: 2 } ],
        'Addis Fellowship':       [ { name: 'Dawit Bekele',           yearJoined: 2011, age: 49, mentoredBy: null,                     mentoring: ['Tigist Haile','Girma Tadesse'],      discipleshipLevel: 4 },
                                    { name: 'Tigist Haile',           yearJoined: 2014, age: 38, mentoredBy: 'Dawit Bekele',            mentoring: [],                                    discipleshipLevel: 3 } ],
        'Oromia New Life Church': [ { name: 'Girma Tadesse',          yearJoined: 2018, age: 33, mentoredBy: 'Dawit Bekele',            mentoring: [],                                    discipleshipLevel: 2 } ],
        'Accra Peace':            [ { name: 'Kwame Mensah',           yearJoined: 2010, age: 51, mentoredBy: null,                     mentoring: ['Abena Asante','Kofi Boateng'],       discipleshipLevel: 4 },
                                    { name: 'Abena Asante',           yearJoined: 2013, age: 40, mentoredBy: 'Kwame Mensah',            mentoring: [],                                    discipleshipLevel: 3 } ],
        'Kumasi Grace Church':    [ { name: 'Kofi Boateng',           yearJoined: 2015, age: 36, mentoredBy: 'Kwame Mensah',            mentoring: [],                                    discipleshipLevel: 2 } ],
        'Maputo Vineyard':        [ { name: 'Helder Mondlane',        yearJoined: 2013, age: 45, mentoredBy: null,                     mentoring: ['Graca Sitoe'],                       discipleshipLevel: 4 },
                                    { name: 'Graca Sitoe',            yearJoined: 2016, age: 35, mentoredBy: 'Helder Mondlane',         mentoring: [],                                    discipleshipLevel: 2 } ],
        'Kathmandu Church':       [ { name: 'Binod Thapa',            yearJoined: 2012, age: 44, mentoredBy: null,                     mentoring: ['Sita Rai','Prakash Gurung'],         discipleshipLevel: 4 },
                                    { name: 'Sita Rai',               yearJoined: 2015, age: 37, mentoredBy: 'Binod Thapa',             mentoring: [],                                    discipleshipLevel: 2 } ],
        'Pokhara Lighthouse':     [ { name: 'Prakash Gurung',         yearJoined: 2017, age: 30, mentoredBy: 'Binod Thapa',             mentoring: [],                                    discipleshipLevel: 2 } ],
        'Juba Fellowship':        [ { name: 'John Deng',              yearJoined: 2015, age: 43, mentoredBy: null,                     mentoring: ['Rebecca Akol'],                      discipleshipLevel: 3 },
                                    { name: 'Rebecca Akol',           yearJoined: 2017, age: 31, mentoredBy: 'John Deng',               mentoring: [],                                    discipleshipLevel: 2 } ],
        'Colombo Hope':           [ { name: 'Roshan Fernando',        yearJoined: 2014, age: 46, mentoredBy: null,                     mentoring: ['Priya De Silva','Nimal Perera'],     discipleshipLevel: 4 },
                                    { name: 'Priya De Silva',         yearJoined: 2016, age: 38, mentoredBy: 'Roshan Fernando',         mentoring: [],                                    discipleshipLevel: 3 } ],
        'Kandy Covenant Church':  [ { name: 'Nimal Perera',           yearJoined: 2019, age: 32, mentoredBy: 'Roshan Fernando',         mentoring: [],                                    discipleshipLevel: 1 } ],
        'Dar es Salaam Church':   [ { name: 'Emmanuel Mkapa',         yearJoined: 2010, age: 50, mentoredBy: null,                     mentoring: ['Fatuma Juma','Joseph Mwenda'],       discipleshipLevel: 4 },
                                    { name: 'Fatuma Juma',            yearJoined: 2013, age: 39, mentoredBy: 'Emmanuel Mkapa',          mentoring: [],                                    discipleshipLevel: 3 } ],
        'Arusha Mountain Church': [ { name: 'Joseph Mwenda',          yearJoined: 2016, age: 34, mentoredBy: 'Emmanuel Mkapa',          mentoring: [],                                    discipleshipLevel: 2 } ],
        'Kampala Light':          [ { name: 'Moses Ssekandi',         yearJoined: 2011, age: 47, mentoredBy: null,                     mentoring: ['Esther Namutebi','Patrick Okello'],  discipleshipLevel: 4 },
                                    { name: 'Esther Namutebi',        yearJoined: 2014, age: 36, mentoredBy: 'Moses Ssekandi',          mentoring: [],                                    discipleshipLevel: 3 } ],
        'Gulu Restoration Church':[ { name: 'Patrick Okello',         yearJoined: 2018, age: 31, mentoredBy: 'Moses Ssekandi',          mentoring: [],                                    discipleshipLevel: 2 } ]
    }
};

const countries = [
    { name: 'United States', coords: [39.8283,  -98.5795], countryCode: 'us', level: 'L2',
      churches: [
          { coords: [38.9,  -97.5],  name: 'Grace Church' },
          { coords: [39.5,  -98.0],  name: 'Hidden Vineyard' },
          { coords: [40.0, -100.0],  name: 'Prairie Ministries' }
      ]
    },
    { name: 'Kenya',       coords: [-0.0236,  37.9062], countryCode: 'ke', level: 'L4', sensitive: true,
      churches: [
          { coords: [-1.0, 37.9], name: 'Nairobi Peace Church' },
          { coords: [0.0,  38.0], name: 'Riverbank Fellowship' },
          { coords: [-0.5, 38.2], name: 'Hilltop Assembly' }
      ]
    },
    { name: 'India',      coords: [20.5937,  78.9629], countryCode: 'in', level: 'L1',
      churches: [{ coords: [28.6139, 77.2090], name: 'Delhi Grace' }]
    },
    { name: 'Russia',     coords: [61.5240, 105.3188], countryCode: 'ru', level: 'inactive',
      churches: [{ coords: [55.7558, 37.6173], name: 'Moscow Light' }]
    },
    { name: 'Nigeria',    coords: [9.0820,    8.6753], countryCode: 'ng',
      churches: [
          { coords: [9.0765, 7.3986], name: 'Abuja Fellowship' },
          { coords: [6.5244, 3.3792], name: 'Lagos Harvest Church' }
      ]
    },
    { name: 'Bulgaria',   coords: [42.7339,  25.4858], countryCode: 'bg', level: 'cancelled',
      churches: [{ coords: [42.6977, 23.3219], name: 'Sofia Church' }]
    },
    { name: 'Burundi',    coords: [-3.3731,  29.9189], countryCode: 'bi',
      churches: [
          { coords: [-3.3869, 29.3624], name: 'Bujumbura Hope' },
          { coords: [-3.43,   29.93],   name: 'Gitega Community Church' }
      ]
    },
    { name: 'Egypt',      coords: [26.8206,  30.8025], countryCode: 'eg',
      churches: [{ coords: [30.0444, 31.2357], name: 'Cairo Light' }]
    },
    { name: 'Ethiopia',   coords: [9.1450,   40.4897], countryCode: 'et',
      churches: [
          { coords: [9.03, 38.74], name: 'Addis Fellowship' },
          { coords: [8.5,  39.2],  name: 'Oromia New Life Church' }
      ]
    },
    { name: 'Ghana',      coords: [7.9465,   -1.0232], countryCode: 'gh',
      churches: [
          { coords: [5.6037, -0.1870], name: 'Accra Peace' },
          { coords: [6.6885, -1.623],  name: 'Kumasi Grace Church' }
      ]
    },
    { name: 'Mozambique', coords: [-18.6657, 35.5296], countryCode: 'mz',
      churches: [{ coords: [-25.9655, 32.5832], name: 'Maputo Vineyard' }]
    },
    { name: 'Nepal',      coords: [28.3949,  84.1240], countryCode: 'np',
      churches: [
          { coords: [27.7172, 85.3240], name: 'Kathmandu Church' },
          { coords: [28.2,    83.98],   name: 'Pokhara Lighthouse' }
      ]
    },
    { name: 'South Sudan', coords: [6.8769,  31.3069], countryCode: 'ss',
      churches: [{ coords: [4.8594, 31.5713], name: 'Juba Fellowship' }]
    },
    { name: 'Sri Lanka',  coords: [7.8731,   80.7718], countryCode: 'lk',
      churches: [
          { coords: [6.9271, 79.8612], name: 'Colombo Hope' },
          { coords: [7.295,  80.636],  name: 'Kandy Covenant Church' }
      ]
    },
    { name: 'Tanzania',   coords: [-6.3690,  34.8888], countryCode: 'tz',
      churches: [
          { coords: [-6.1630, 35.7516], name: 'Dar es Salaam Church' },
          { coords: [-3.387,  36.682],  name: 'Arusha Mountain Church' }
      ]
    },
    { name: 'Uganda',     coords: [1.3733,   32.2903], countryCode: 'ug',
      churches: [
          { coords: [0.3476, 32.5825], name: 'Kampala Light' },
          { coords: [2.775,  32.299],  name: 'Gulu Restoration Church' }
      ]
    }
];

// ── Layer groups ──────────────────────────────────────────────────────────────
const churchMarkers     = L.layerGroup().addTo(map);
const stateMarkers      = L.layerGroup().addTo(map);
const countryMarkers    = L.layerGroup().addTo(map);
const stateShapeMarkers = L.layerGroup().addTo(map);

// ── Security & Map Logic ──────────────────────────────────────────────────────
function isIn1040Window(coords) {
    const [lat, lng] = coords;
    return lat >= -10 && lat <= 40 && lng >= -10 && lng <= 145;
}

let pinSecurityMode = 'normal';

function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

function getObfuscatedCoords(ch) {
    const h = hashStr(ch.name);
    return [
        ch.coords[0] + ((h & 0xFF) / 255 - 0.5) * 0.27,
        ch.coords[1] + (((h >> 8) & 0xFF) / 255 - 0.5) * 0.27
    ];
}

function resolveCoords(ch) {
    if (!isIn1040Window(ch.coords)) return ch.coords;          
    if (pinSecurityMode === 'hidden') return null;           
    if (pinSecurityMode === 'obfuscate') return getObfuscatedCoords(ch); 
    return ch.coords;                                           
}

function createDotIcon(countryCode, d = 32) {
    const img = d - 8;
    return L.divIcon({
        html: `<div style="background:#db5729;width:${d}px;height:${d}px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="https://flagcdn.com/h40/${countryCode}.png" style="width:${img}px;height:${img}px;border-radius:50%"></div>`,
        iconSize: [d, d], iconAnchor: [d/2, d/2], className: 'custom-dot'
    });
}

// ── Sidebar & Accordion ───────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebarContent');

function openSidebar(html) {
    sidebarContent.innerHTML = html;
    sidebar.classList.add('open');
}

function setupToggles(container) {
    if (!container) return;
    container.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const el = container.querySelector('#' + btn.dataset.target);
            if (!el) return;
            const isHidden = el.style.display === 'none';
            el.style.display = isHidden ? 'block' : 'none';
            btn.textContent  = (isHidden ? '▼ ' : '▶ ') + btn.dataset.label;
        });
    });
}

document.getElementById('closeSidebar').addEventListener('click', () => {
    sidebar.classList.remove('open');
    showAllCountries();
});

map.on('click', () => {
    sidebar.classList.remove('open');
    showAllCountries();
});

function generateChurchDetailsHTML(chName, countryCode, uniqueId, expanded = false, showHeader = true) {
    const details = placeholderData.churchDetails[chName] || {};
    const staff = placeholderData.staffDetails[chName] || [];
    const displayStyle = expanded ? 'block' : 'none';
    const toggleIcon = expanded ? '▼' : '▶';

    let html = `<div class="church-accordion" style="margin-top: 8px;">`;
    if (showHeader) {
        html += `<button class="toggle-btn main-church-toggle" style="background:#f9f9f9; border-left: 4px solid #db5729;" data-target="church-wrap-${uniqueId}" data-label="${chName}">${toggleIcon} ${chName}</button>`;
    }
    const wrapStyle = showHeader ? `display:${displayStyle}; border-left: 1px solid #ddd; margin-left: 4px; padding-left: 10px; margin-bottom: 12px; padding-bottom: 8px;` : `display:block;`;
    html += `<div id="church-wrap-${uniqueId}" class="toggle-content" style="${wrapStyle}">
            <button class="toggle-btn" data-target="cinfo-${uniqueId}" data-label="Church Info">▼ Church Info</button>
            <div id="cinfo-${uniqueId}" class="toggle-content" style="display:block;">`;
    
    if (details.yearStarted) html += `<p><span class="label">Year started</span><span class="value">${details.yearStarted}</span></p>`;
    if (details.attendees) html += `<p><span class="label">Attendees</span><span class="value">${details.attendees}</span></p>`;
    if (details.leaders?.length) html += `<p><span class="label">Leaders</span><span class="value">${details.leaders.join(', ')}</span></p>`;
    if (details.parentChurch) html += `<p><span class="label">Parent church</span><span class="value">${details.parentChurch}</span></p>`;
    if (details.siblingChurches?.length) html += `<p><span class="label">Sibling churches</span><span class="value">${details.siblingChurches.join(', ')}</span></p>`;
    if (!details.yearStarted && !details.attendees) html += `<p class="no-data">No details on record yet.</p>`;
    html += `</div>`;

    html += `<button class="toggle-btn" data-target="sinfo-${uniqueId}" data-label="Staff (${staff.length})">▼ Staff (${staff.length})</button>
             <div id="sinfo-${uniqueId}" class="toggle-content" style="display:block;">`;
    if (staff.length) {
        staff.forEach(s => {
            const pct = Math.round(((s.discipleshipLevel || 1) / 4) * 100);
            html += `<div class="staff-card">
                <p class="staff-name">${s.name}</p>
                <p><span class="label">Year joined</span><span class="value">${s.yearJoined}</span></p>
                ${s.age ? `<p><span class="label">Age</span><span class="value">${s.age}</span></p>` : ''}
                <p><span class="label">Mentored by</span><span class="value">${s.mentoredBy || 'None'}</span></p>
                ${s.mentoring?.length ? `<p><span class="label">Mentoring</span><span class="value">${s.mentoring.join(', ')}</span></p>` : ''}
                <p><span class="label">Discipleship</span>
                  <span class="value disc-bar-wrap">
                    <span class="disc-bar" style="width:${pct}%"></span>
                    <span class="disc-label">${s.discipleshipLevel || 1}/4</span>
                  </span></p>
            </div>`;
        });
    } else {
        html += `<p class="no-data">No staff on record yet.</p>`;
    }
    html += `</div></div></div>`;
    return html;
}

function buildChurchSidebar(ch, countryCode) {
    const sensitive = isIn1040Window(ch.coords);
    let notice = '';
    if (sensitive && pinSecurityMode === 'obfuscate') notice = `<div class="obscure-notice">📍 Pin location is approximate for security (10/40 Window)</div>`;
    else if (sensitive && pinSecurityMode === 'hidden') notice = `<div class="obscure-notice">🔒 10/40 Window church — pin hidden on map</div>`;
    let html = `<div class="sb-header"><img src="https://flagcdn.com/h30/${countryCode}.png" class="flag-icon" alt="flag"><h2>${ch.name}</h2></div>${notice}<hr>`;
    html += generateChurchDetailsHTML(ch.name, countryCode, 'direct-pin', true, false);
    return html;
}

function buildCountrySidebar(country) {
    const stats  = placeholderData.countryStats[country.name] || { churches:0, groups:0, staff:0, volunteers:0 };
    const states = placeholderData.stateStats[country.name];
    let html = `<div class="sb-header"><img src="https://flagcdn.com/h30/${country.countryCode}.png" class="flag-icon" alt="${country.name} flag"><h2>${country.name}</h2></div><hr>
        <div class="stat-grid">
          <div class="stat-cell"><span class="stat-num">${stats.churches}</span><span class="stat-lbl">Churches</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.groups}</span><span class="stat-lbl">Groups</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.staff}</span><span class="stat-lbl">Staff</span></div>
          <div class="stat-cell"><span class="stat-num">${stats.volunteers||0}</span><span class="stat-lbl">Volunteers</span></div>
        </div>`;

    if (states && Object.keys(states).length > 0) {
        html += `<hr><h3 style="margin-top:15px; margin-bottom:10px; font-size: 1.05em; color: #444;">Regional Breakdown</h3><ul class="state-list">`;
        for (const [name, data] of Object.entries(states)) {
            html += `<li style="margin-bottom: 15px;"><strong>${name}</strong><span style="display:block; margin-bottom:8px;">${data.churches} churches · ${data.groups} groups · ${data.staff} staff</span>`;
            data.names.forEach((cName, idx) => {
                const safeStateName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                html += generateChurchDetailsHTML(cName, country.countryCode, `country-${safeStateName}-${idx}`, false, true);
            });
            html += `</li>`;
        }
        html += `</ul>`;
    } else {
        html += `<hr><h3 style="margin-top:15px; margin-bottom:10px; font-size: 1.05em; color: #444;">Churches</h3>`;
        country.churches.forEach((ch, idx) => {
            html += generateChurchDetailsHTML(ch.name, country.countryCode, `country-direct-${idx}`, false, true);
        });
    }
    return html;
}

function buildStateSidebar(stateName, stateData, countryData) {
    let html = `<div class="sb-header"><img src="https://flagcdn.com/h30/${countryData.countryCode}.png" class="flag-icon" alt="${countryData.name} flag"><h2>${stateName}</h2></div><hr>`;
    if (stateData) {
        html += `<div class="stat-grid">
          <div class="stat-cell"><span class="stat-num">${stateData.churches}</span><span class="stat-lbl">Churches</span></div>
          <div class="stat-cell"><span class="stat-num">${stateData.groups}</span><span class="stat-lbl">Groups</span></div>
          <div class="stat-cell"><span class="stat-num">${stateData.staff}</span><span class="stat-lbl">Staff</span></div>
        </div>`;
        html += `<hr><h3 style="margin-top:15px; margin-bottom:10px; font-size: 1.05em; color: #444;">Churches in ${stateName}</h3>`;
        stateData.names.forEach((cName, idx) => {
            html += generateChurchDetailsHTML(cName, countryData.countryCode, `state-${idx}`, false, true);
        });
    } else {
        html += `<p class="no-data">No active ministries in this region yet.</p>`;
    }
    return html;
}

// ── GeoJSON Map Rendering ─────────────────────────────────────────────────────
let worldGeoJSON = null;
let usGeoJSON = null;
let indiaGeoJSON = null;
let currentCountry = null;
let currentStateChurches = null;

const geoJsonNameMap = { 'United States': 'United States of America', 'Tanzania': 'United Republic of Tanzania' };

function renderSpecificChurchPins(churchesList, countryCode) {
    churchMarkers.clearLayers();
    if (!churchesList) return;
    churchesList.forEach(ch => {
        const pos = resolveCoords(ch);
        if (pos === null) return;
        const m = L.marker(pos, { icon: createDotIcon(countryCode, 32), title: ch.name });
        m.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            openSidebar(buildChurchSidebar(ch, countryCode));
            setupToggles(sidebarContent);
        });
        m.addTo(churchMarkers);
    });
}

function renderStateShapes(geoJsonData, countryData) {
    L.geoJSON(geoJsonData, {
        style: function() { return { color: '#2e7d32', weight: 2, fillColor: '#2e7d32', fillOpacity: 0.35, className: 'state-shape' }; },
        onEachFeature: function(feature, layer) {
            layer.on('mouseover', function() { this.setStyle({ fillOpacity: 0.65 }); });
            layer.on('mouseout', function() { this.setStyle({ fillOpacity: 0.35 }); });
            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                map.setMaxZoom(12);
                map.fitBounds(layer.getBounds(), { padding: [30, 30], animate: true });
                stateShapeMarkers.clearLayers();

                const stateName = feature.properties.name || feature.properties.NAME_1 || feature.properties.st_nm || "Unknown State";
                const stateStats = placeholderData.stateStats[countryData.name];

                let matchedStateData = null;
                let matchedStateName = null;
                if (stateStats) {
                    for (const [sName, sData] of Object.entries(stateStats)) {
                        if (stateName.toLowerCase().includes(sName.toLowerCase()) || sName.toLowerCase().includes(stateName.toLowerCase())) {
                            matchedStateData = sData;
                            matchedStateName = sName;
                            break;
                        }
                    }
                }

                let churchesToRender = [];
                if (matchedStateData && matchedStateData.names) {
                    churchesToRender = countryData.churches.filter(c => matchedStateData.names.includes(c.name));
                }
                
                currentStateChurches = churchesToRender;
                renderSpecificChurchPins(churchesToRender, countryData.countryCode);
                
                openSidebar(buildStateSidebar(matchedStateName || stateName, matchedStateData, countryData));
                setupToggles(sidebarContent);
            });
        }
    }).addTo(stateShapeMarkers);
}

function showAllCountries() {
    map.setMaxZoom(2);
    map.setView([20, 0], 2);
    currentCountry = null;
    currentStateChurches = null;
    countryMarkers.clearLayers();
    churchMarkers.clearLayers();
    stateMarkers.clearLayers();
    stateShapeMarkers.clearLayers();

    if (!worldGeoJSON) return;

    const activeCountries = {};
    countries.forEach(c => {
        if (pinSecurityMode === 'hidden') {
            const allHidden = c.churches.every(ch => isIn1040Window(ch.coords));
            if (allHidden) return;
        }
        const searchName = geoJsonNameMap[c.name] || c.name;
        activeCountries[searchName] = c;
    });

    L.geoJSON(worldGeoJSON, {
        filter: function(feature) { return activeCountries[feature.properties.name] !== undefined; },
        style: function() { return { color: '#db5729', weight: 2, fillColor: '#db5729', fillOpacity: 0.35, className: 'country-shape' }; },
        onEachFeature: function(feature, layer) {
            const countryData = activeCountries[feature.properties.name];

            layer.on('mouseover', function() { this.setStyle({ fillOpacity: 0.65 }); });
            layer.on('mouseout', function() { this.setStyle({ fillOpacity: 0.35 }); });

            layer.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                map.setMaxZoom(8);
                countryMarkers.clearLayers();
                map.fitBounds(layer.getBounds(), { padding: [20, 20], animate: true });

                currentCountry = countryData;

                if (countryData.name === 'United States' && usGeoJSON) {
                    renderStateShapes(usGeoJSON, countryData);
                } else if (countryData.name === 'India' && indiaGeoJSON) {
                    renderStateShapes(indiaGeoJSON, countryData);
                } else {
                    renderSpecificChurchPins(countryData.churches, countryData.countryCode);
                    const states = placeholderData.stateStats[countryData.name];
                    stateMarkers.clearLayers();
                    if (states) {
                        Object.entries(states).forEach(([name, data]) => {
                            const m = L.marker(data.coords || countryData.coords, { icon: createDotIcon(countryData.countryCode, 28), title: name });
                            m.bindPopup(`<strong>${name}</strong><br>${data.churches} churches · ${data.groups} groups · ${data.staff} staff`);
                            m.addTo(stateMarkers);
                        });
                    }
                    openSidebar(buildCountrySidebar(countryData));
                    setupToggles(sidebarContent);
                }
            });
        }
    }).addTo(countryMarkers);
}

// Fetch GeoJSON Maps
fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
    .then(r => r.json()).then(data => { worldGeoJSON = data; showAllCountries(); })
    .catch(err => console.error("Error loading world borders:", err));

fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
    .then(r => r.json()).then(data => usGeoJSON = data);

fetch('https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson')
    .then(r => r.json()).then(data => indiaGeoJSON = data)
    .catch(() => {
        fetch('https://gist.githubusercontent.com/shantanuo/91c13bf8fb851eec70d0/raw/india_state.geojson')
        .then(r => r.json()).then(data => indiaGeoJSON = data);
    });

// ── Modals & Security Logic ───────────────────────────────────────────────────
const overviewModal = document.getElementById('globalOverviewModal');
document.getElementById('globalOverviewBtn').onclick = (e) => { e.stopPropagation(); overviewModal.style.display = 'block'; }
document.getElementById('closeOverview').onclick = () => { overviewModal.style.display = 'none'; }

const securityBtn = document.getElementById('obscurePinsBtn');
const securityPopup = document.getElementById('securityPopup');
const securityOpts = securityPopup.querySelectorAll('.sec-option');

securityBtn.onclick = (e) => {
    e.stopPropagation();
    const opening = !securityPopup.classList.contains('open');
    securityPopup.classList.toggle('open', opening);
    securityBtn.classList.toggle('active', opening);
};

document.addEventListener('click', (e) => {
    if (!securityPopup.contains(e.target) && e.target !== securityBtn) {
        securityPopup.classList.remove('open');
        securityBtn.classList.remove('active');
    }
    if (e.target === overviewModal) overviewModal.style.display = 'none';
});

function applySecurityMode(mode) {
    pinSecurityMode = (pinSecurityMode === mode) ? 'normal' : mode;
    securityOpts.forEach(o => o.classList.toggle('selected', o.dataset.mode === pinSecurityMode));
    securityBtn.textContent = { normal: '🔓', obfuscate: '🔀', hidden: '🔒' }[pinSecurityMode];
    securityPopup.classList.remove('open');
    securityBtn.classList.remove('active');

    if (currentStateChurches) renderSpecificChurchPins(currentStateChurches, currentCountry.countryCode);
    else if (currentCountry) renderSpecificChurchPins(currentCountry.churches, currentCountry.countryCode);
    else showAllCountries();
}

securityOpts.forEach(opt => opt.onclick = (e) => { e.stopPropagation(); applySecurityMode(opt.dataset.mode); });

// ── Forms Dashboard Page Logic ────────────────────────────────────────────────
const formsPage = document.getElementById('formsPage');
const formCards = document.querySelectorAll('.form-card');
const formSections = document.querySelectorAll('.form-section');

let addChurchMapInstance = null;
let addChurchMarker = null;

// Function to populate the dropdowns every time the page opens
function populateFormDropdowns() {
    const countrySelect = document.getElementById('churchCountrySelect');
    const staffChurchSelect = document.getElementById('staffChurchSelect');
    
    // Clear existing
    countrySelect.innerHTML = '<option value="">-- Choose Country --</option>';
    staffChurchSelect.innerHTML = '<option value="">-- Choose Church --</option>';

    // Add updated countries
    countries.forEach(c => {
        countrySelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        c.churches.forEach(ch => {
            staffChurchSelect.innerHTML += `<option value="${ch.name}">${ch.name} (${c.name})</option>`;
        });
    });
}

// Initialize the secondary map inside the Add Church form
function initAddChurchMap() {
    if (!addChurchMapInstance) {
        addChurchMapInstance = L.map('addChurchMap', {
            minZoom: 1, maxZoom: 16, zoom: 2
        }).setView([20, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(addChurchMapInstance);

        // Click event to drop the pin
        addChurchMapInstance.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            document.getElementById('addChurchLat').value = lat;
            document.getElementById('addChurchLng').value = lng;
            document.getElementById('selectedCoordsText').textContent = `Location Selected! (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;

            if (addChurchMarker) {
                addChurchMarker.setLatLng(e.latlng);
            } else {
                addChurchMarker = L.marker(e.latlng).addTo(addChurchMapInstance);
            }
        });
    } else {
        setTimeout(() => { addChurchMapInstance.invalidateSize(); }, 100);
    }
}

// When a country is selected, move the mini-map to that country
document.getElementById('churchCountrySelect').addEventListener('change', function() {
    const cName = this.value;
    if (!cName || !worldGeoJSON || !addChurchMapInstance) return;

    const searchName = geoJsonNameMap[cName] || cName;
    const feature = worldGeoJSON.features.find(f => f.properties.name.toLowerCase() === searchName.toLowerCase());
    
    if (feature) {
        const tempLayer = L.geoJSON(feature);
        addChurchMapInstance.fitBounds(tempLayer.getBounds(), { padding: [20, 20] });
    } else {
        // Fallback to the country's default pin coords
        const cObj = countries.find(c => c.name === cName);
        if (cObj) {
            addChurchMapInstance.setView(cObj.coords, 5);
        }
    }
});

// Open dashboard
document.getElementById('addDataBtn').onclick = () => {
    populateFormDropdowns();
    formsPage.style.display = 'block';
    
    if (!addChurchMapInstance) {
        initAddChurchMap();
    }
};

// Close dashboard & refresh map
document.getElementById('closeFormsPage').onclick = () => {
    formsPage.style.display = 'none';
    showAllCountries();
};

// Switch between the 3 forms
formCards.forEach(card => {
    card.onclick = () => {
        // Remove active from all
        formCards.forEach(c => c.classList.remove('active'));
        formSections.forEach(s => s.classList.remove('active'));
        
        // Make clicked active
        card.classList.add('active');
        document.getElementById(card.dataset.target).classList.add('active');
        
        // Fix Leaflet rendering bug when map container changes visibility
        if (card.dataset.target === 'addChurchSection') {
            setTimeout(() => { if (addChurchMapInstance) addChurchMapInstance.invalidateSize(); }, 50);
        }
    };
});

// Helper for finding state when adding staff to a church
function getChurchLocationData(churchName) {
    for (const c of countries) {
        if (c.churches.find(ch => ch.name === churchName)) {
            let stateName = 'Unknown';
            const states = placeholderData.stateStats[c.name];
            if (states) {
                for (const [sName, sData] of Object.entries(states)) {
                    if (sData.names.includes(churchName)) {
                        stateName = sName; break;
                    }
                }
            }
            return { country: c.name, state: stateName };
        }
    }
    return { country: null, state: null };
}

// 1. Submit Add Country Form (Now calculates Center Automatically)
document.getElementById('formAddCountry').addEventListener('submit', function(e) {
    e.preventDefault();
    const cName = document.getElementById('addCountryName').value.trim();
    const cCode = document.getElementById('addCountryCode').value.trim().toLowerCase();
    
    let lat = 0, lng = 0;
    if (worldGeoJSON) {
        const searchName = geoJsonNameMap[cName] || cName;
        const feature = worldGeoJSON.features.find(f => f.properties.name.toLowerCase() === searchName.toLowerCase());
        
        if (feature) {
            const tempLayer = L.geoJSON(feature);
            const center = tempLayer.getBounds().getCenter();
            lat = center.lat;
            lng = center.lng;
        } else {
            alert(`Could not find borders for "${cName}". Please check the spelling (e.g., "Germany").`);
            return; 
        }
    } else {
        alert("Map data is still loading. Please try again in a moment.");
        return;
    }

    if (!countries.find(c => c.name.toLowerCase() === cName.toLowerCase())) {
        countries.push({ name: cName, coords: [lat, lng], countryCode: cCode, churches: [] });
        placeholderData.countryStats[cName] = { churches: 0, groups: 0, staff: 0, volunteers: 0 };
        placeholderData.stateStats[cName] = {};
        alert(`Successfully added Country: ${cName}`);
    } else {
        alert(`${cName} already exists!`);
    }
    this.reset();
    populateFormDropdowns();
});

// 2. Submit Add Church Form
document.getElementById('formAddChurch').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const latStr = document.getElementById('addChurchLat').value;
    const lngStr = document.getElementById('addChurchLng').value;

    if (!latStr || !lngStr) {
        alert("Please click on the mini-map to drop a pin for the church location.");
        return;
    }

    const cName = document.getElementById('churchCountrySelect').value;
    const sName = document.getElementById('addChurchState').value.trim();
    const chName = document.getElementById('addChurchName').value.trim();
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const year = document.getElementById('addChurchYear').value;
    const attendees = document.getElementById('addChurchAttendees').value;

    const countryObj = countries.find(c => c.name === cName);
    if (!countryObj) return alert("Country not found");

    countryObj.churches.push({ name: chName, coords: [lat, lng] });
    
    placeholderData.churchDetails[chName] = { yearStarted: year || null, attendees: attendees || null, leaders: [], parentChurch: 'None' };
    placeholderData.staffDetails[chName] = [];
    
    placeholderData.countryStats[cName].churches += 1;

    if (!placeholderData.stateStats[cName]) placeholderData.stateStats[cName] = {};
    if (!placeholderData.stateStats[cName][sName]) placeholderData.stateStats[cName][sName] = { coords: [lat, lng], churches: 0, groups: 0, staff: 0, names: [] };
    
    placeholderData.stateStats[cName][sName].churches += 1;
    placeholderData.stateStats[cName][sName].names.push(chName);

    alert(`Successfully added Church: ${chName}`);
    
    // Reset the map pin and form
    this.reset();
    document.getElementById('selectedCoordsText').textContent = "No location selected yet. Click the map!";
    if (addChurchMarker) {
        addChurchMapInstance.removeLayer(addChurchMarker);
        addChurchMarker = null;
    }
    document.getElementById('addChurchLat').value = '';
    document.getElementById('addChurchLng').value = '';
    
    populateFormDropdowns();
});

// 3. Submit Add Staff Form
document.getElementById('formAddStaff').addEventListener('submit', function(e) {
    e.preventDefault();
    const chName = document.getElementById('staffChurchSelect').value;
    const staffName = document.getElementById('addStaffName').value.trim();
    const age = document.getElementById('addStaffAge').value;
    const yearJoined = document.getElementById('addStaffYear').value;
    const level = document.getElementById('addStaffLevel').value;

    if (!placeholderData.staffDetails[chName]) placeholderData.staffDetails[chName] = [];
    
    placeholderData.staffDetails[chName].push({
        name: staffName, 
        yearJoined: yearJoined || new Date().getFullYear(), 
        age: age || null, 
        discipleshipLevel: level
    });

    const loc = getChurchLocationData(chName);
    if (loc.country) placeholderData.countryStats[loc.country].staff += 1;
    if (loc.country && loc.state && placeholderData.stateStats[loc.country][loc.state]) {
        placeholderData.stateStats[loc.country][loc.state].staff += 1;
    }

    alert(`Successfully added ${staffName} to ${chName}`);
    this.reset();
});

// Render Global Dashboard
function renderGlobalDashboard() {
    const active = countries.filter(c => !['inactive','cancelled'].includes((c.level||'').toLowerCase()));
    document.getElementById('totalCountries').textContent = active.length;
    document.getElementById('countryList').innerHTML = active.map(c => `<li>${c.name}</li>`).join('');
    let tC=0, tG=0, tS=0, tV=0;
    Object.values(placeholderData.countryStats).forEach(s => { tC += s.churches||0; tG += s.groups||0; tS += s.staff||0; tV += s.volunteers||0; });
    document.getElementById('totalChurches').textContent = tC;
    document.getElementById('totalGroups').textContent = tG;
    document.getElementById('totalStaff').textContent = tS;
    document.getElementById('totalVolunteers').textContent = tV;
}

const toggleCountryBtn = document.getElementById('toggleCountryList');
if (toggleCountryBtn) {
    toggleCountryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = document.getElementById('countryList');
        const vis = el.style.display !== 'none' && el.style.display !== '';
        el.style.display = vis ? 'none' : 'block';
        e.target.textContent = vis ? 'Hide list' : 'Show list';
    });
}

renderGlobalDashboard();