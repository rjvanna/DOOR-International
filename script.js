// ── Map init ──────────────────────────────────────────────────────────────────
const map = L.map('map', {
    minZoom: 2, maxZoom: 12, zoom: 2,
    dragging: true, scrollWheelZoom: true, zoomControl: false // Disable default zoom
}).setView([20, 0], 2);

map.setMaxBounds([[-90, -180], [90, 180]]);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors', noWrap: true
}).addTo(map);

// Move controls to bottom right so our custom toolbar sits clean top left
L.control.zoom({ position: 'bottomright' }).addTo(map);
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
        'Grace Church':           [ { name: 'John Smith',             yearJoined: 2010, age: 48, mentoredBy: null,                     mentoring: ['Mary Johnson','David Lee'] },
                                    { name: 'Mary Johnson',           yearJoined: 2013, age: 39, mentoredBy: 'John Smith',              mentoring: ['Lisa Garcia'] } ],
        'Hidden Vineyard':        [ { name: 'David Lee',              yearJoined: 2015, age: 34, mentoredBy: 'John Smith',              mentoring: [] } ],
        'Prairie Ministries':     [ { name: 'Sarah Williams',         yearJoined: 2008, age: 52, mentoredBy: null,                     mentoring: ['James Brown'] },
                                    { name: 'James Brown',            yearJoined: 2011, age: 44, mentoredBy: 'Sarah Williams',          mentoring: [] } ],
        'Nairobi Peace Church':   [ { name: 'Peter Mwangi',           yearJoined: 2012, age: 54, mentoredBy: null,                     mentoring: ['Grace Kipchoge','Samuel Otieno'] },
                                    { name: 'Grace Kipchoge',         yearJoined: 2015, age: 36, mentoredBy: 'Peter Mwangi',            mentoring: [] } ],
        'Riverbank Fellowship':   [ { name: 'Samuel Otieno',          yearJoined: 2016, age: 31, mentoredBy: 'Peter Mwangi',            mentoring: [] } ],
        'Hilltop Assembly':       [ { name: 'Faith Kariuki',          yearJoined: 2014, age: 40, mentoredBy: 'Peter Mwangi',            mentoring: ['Joseph Kiplagat'] },
                                    { name: 'Joseph Kiplagat',        yearJoined: 2017, age: 28, mentoredBy: 'Faith Kariuki',           mentoring: [] } ],
        'Delhi Grace':            [ { name: 'Raj Patel',              yearJoined: 2018, age: 42, mentoredBy: null,                     mentoring: ['Priya Singh'] },
                                    { name: 'Priya Singh',            yearJoined: 2019, age: 33, mentoredBy: 'Raj Patel',               mentoring: [] } ],
        'Moscow Light':           [ { name: 'Alexei Volkov',          yearJoined: 2011, age: 50, mentoredBy: null,                     mentoring: ['Natasha Romanova'] },
                                    { name: 'Natasha Romanova',       yearJoined: 2014, age: 37, mentoredBy: 'Alexei Volkov',           mentoring: [] } ],
        'Abuja Fellowship':       [ { name: 'Emeka Okafor',           yearJoined: 2013, age: 46, mentoredBy: null,                     mentoring: ['Chioma Nwosu','Tunde Adeyemi'] },
                                    { name: 'Chioma Nwosu',           yearJoined: 2015, age: 35, mentoredBy: 'Emeka Okafor',            mentoring: [] } ],
        'Lagos Harvest Church':   [ { name: 'Tunde Adeyemi',          yearJoined: 2017, age: 38, mentoredBy: 'Emeka Okafor',            mentoring: ['Funke Balogun'] },
                                    { name: 'Funke Balogun',          yearJoined: 2019, age: 30, mentoredBy: 'Tunde Adeyemi',           mentoring: [] } ],
        'Sofia Church':           [ { name: 'Georgi Petrov',          yearJoined: 2009, age: 55, mentoredBy: null,                     mentoring: ['Elena Dimitrova'] },
                                    { name: 'Elena Dimitrova',        yearJoined: 2012, age: 43, mentoredBy: 'Georgi Petrov',           mentoring: [] } ],
        'Bujumbura Hope':         [ { name: 'Jean-Pierre Nkurunziza', yearJoined: 2014, age: 47, mentoredBy: null,                     mentoring: ['Claudine Hakizimana'] },
                                    { name: 'Claudine Hakizimana',    yearJoined: 2016, age: 34, mentoredBy: 'Jean-Pierre Nkurunziza', mentoring: [] } ],
        'Gitega Community Church':[ { name: 'Reverie Ndayishimiye',   yearJoined: 2019, age: 29, mentoredBy: 'Jean-Pierre Nkurunziza', mentoring: [] } ],
        'Cairo Light':            [ { name: 'Mina Girgis',            yearJoined: 2016, age: 41, mentoredBy: null,                     mentoring: ['Maryam Salib'] },
                                    { name: 'Maryam Salib',           yearJoined: 2018, age: 32, mentoredBy: 'Mina Girgis',             mentoring: [] } ],
        'Addis Fellowship':       [ { name: 'Dawit Bekele',           yearJoined: 2011, age: 49, mentoredBy: null,                     mentoring: ['Tigist Haile','Girma Tadesse'] },
                                    { name: 'Tigist Haile',           yearJoined: 2014, age: 38, mentoredBy: 'Dawit Bekele',            mentoring: [] } ],
        'Oromia New Life Church': [ { name: 'Girma Tadesse',          yearJoined: 2018, age: 33, mentoredBy: 'Dawit Bekele',            mentoring: [] } ],
        'Accra Peace':            [ { name: 'Kwame Mensah',           yearJoined: 2010, age: 51, mentoredBy: null,                     mentoring: ['Abena Asante','Kofi Boateng'] },
                                    { name: 'Abena Asante',           yearJoined: 2013, age: 40, mentoredBy: 'Kwame Mensah',            mentoring: [] } ],
        'Kumasi Grace Church':    [ { name: 'Kofi Boateng',           yearJoined: 2015, age: 36, mentoredBy: 'Kwame Mensah',            mentoring: [] } ],
        'Maputo Vineyard':        [ { name: 'Helder Mondlane',        yearJoined: 2013, age: 45, mentoredBy: null,                     mentoring: ['Graca Sitoe'] },
                                    { name: 'Graca Sitoe',            yearJoined: 2016, age: 35, mentoredBy: 'Helder Mondlane',         mentoring: [] } ],
        'Kathmandu Church':       [ { name: 'Binod Thapa',            yearJoined: 2012, age: 44, mentoredBy: null,                     mentoring: ['Sita Rai','Prakash Gurung'] },
                                    { name: 'Sita Rai',               yearJoined: 2015, age: 37, mentoredBy: 'Binod Thapa',             mentoring: [] } ],
        'Pokhara Lighthouse':     [ { name: 'Prakash Gurung',         yearJoined: 2017, age: 30, mentoredBy: 'Binod Thapa',             mentoring: [] } ],
        'Juba Fellowship':        [ { name: 'John Deng',              yearJoined: 2015, age: 43, mentoredBy: null,                     mentoring: ['Rebecca Akol'] },
                                    { name: 'Rebecca Akol',           yearJoined: 2017, age: 31, mentoredBy: 'John Deng',               mentoring: [] } ],
        'Colombo Hope':           [ { name: 'Roshan Fernando',        yearJoined: 2014, age: 46, mentoredBy: null,                     mentoring: ['Priya De Silva','Nimal Perera'] },
                                    { name: 'Priya De Silva',         yearJoined: 2016, age: 38, mentoredBy: 'Roshan Fernando',         mentoring: [] } ],
        'Kandy Covenant Church':  [ { name: 'Nimal Perera',           yearJoined: 2019, age: 32, mentoredBy: 'Roshan Fernando',         mentoring: [] } ],
        'Dar es Salaam Church':   [ { name: 'Emmanuel Mkapa',         yearJoined: 2010, age: 50, mentoredBy: null,                     mentoring: ['Fatuma Juma','Joseph Mwenda'] },
                                    { name: 'Fatuma Juma',            yearJoined: 2013, age: 39, mentoredBy: 'Emmanuel Mkapa',          mentoring: [] } ],
        'Arusha Mountain Church': [ { name: 'Joseph Mwenda',          yearJoined: 2016, age: 34, mentoredBy: 'Emmanuel Mkapa',          mentoring: [] } ],
        'Kampala Light':          [ { name: 'Moses Ssekandi',         yearJoined: 2011, age: 47, mentoredBy: null,                     mentoring: ['Esther Namutebi','Patrick Okello'] },
                                    { name: 'Esther Namutebi',        yearJoined: 2014, age: 36, mentoredBy: 'Moses Ssekandi',          mentoring: [] } ],
        'Gulu Restoration Church':[ { name: 'Patrick Okello',         yearJoined: 2018, age: 31, mentoredBy: 'Moses Ssekandi',          mentoring: [] } ]
    }
};

// Automatically seed dummy discipleship tracking data for all existing staff
const dProgression = ['None', 'Model', 'Assist', 'Watch', 'Leader'];
Object.values(placeholderData.staffDetails).forEach(staffList => {
    staffList.forEach(s => {
        if (!s.discipleship) {
            const rLvl = () => dProgression[Math.floor(Math.random() * dProgression.length)];
            s.discipleship = { evangelism: rLvl(), salvation: rLvl(), baptism: rLvl() };
            const maxIdx = Math.max(
                dProgression.indexOf(s.discipleship.evangelism),
                dProgression.indexOf(s.discipleship.salvation),
                dProgression.indexOf(s.discipleship.baptism)
            );
            s.discipleshipLevel = maxIdx === 0 ? 1 : maxIdx; 
        }
    });
});

const countries = [
    { name: 'United States', coords: [39.8283,  -98.5795], countryCode: 'us', level: 'L2',
      churches: [ { coords: [38.9,  -97.5], name: 'Grace Church' }, { coords: [39.5,  -98.0], name: 'Hidden Vineyard' }, { coords: [40.0, -100.0], name: 'Prairie Ministries' } ]
    },
    { name: 'Kenya', coords: [-0.0236,  37.9062], countryCode: 'ke', level: 'L4', sensitive: true,
      churches: [ { coords: [-1.0, 37.9], name: 'Nairobi Peace Church' }, { coords: [0.0,  38.0], name: 'Riverbank Fellowship' }, { coords: [-0.5, 38.2], name: 'Hilltop Assembly' } ]
    },
    { name: 'India', coords: [20.5937,  78.9629], countryCode: 'in', level: 'L1', churches: [{ coords: [28.6139, 77.2090], name: 'Delhi Grace' }] },
    { name: 'Russia', coords: [61.5240, 105.3188], countryCode: 'ru', level: 'inactive', churches: [{ coords: [55.7558, 37.6173], name: 'Moscow Light' }] },
    { name: 'Nigeria', coords: [9.0820, 8.6753], countryCode: 'ng', level: 'L3', churches: [ { coords: [9.0765, 7.3986], name: 'Abuja Fellowship' }, { coords: [6.5244, 3.3792], name: 'Lagos Harvest Church' } ] },
    { name: 'Bulgaria', coords: [42.7339, 25.4858], countryCode: 'bg', level: 'cancelled', churches: [{ coords: [42.6977, 23.3219], name: 'Sofia Church' }] },
    { name: 'Burundi', coords: [-3.3731, 29.9189], countryCode: 'bi', level: 'L2', churches: [ { coords: [-3.3869, 29.3624], name: 'Bujumbura Hope' }, { coords: [-3.43,   29.93], name: 'Gitega Community Church' } ] },
    { name: 'Egypt', coords: [26.8206, 30.8025], countryCode: 'eg', level: 'L4', churches: [{ coords: [30.0444, 31.2357], name: 'Cairo Light' }] },
    { name: 'Ethiopia', coords: [9.1450, 40.4897], countryCode: 'et', level: 'L3', churches: [ { coords: [9.03, 38.74], name: 'Addis Fellowship' }, { coords: [8.5,  39.2], name: 'Oromia New Life Church' } ] },
    { name: 'Ghana', coords: [7.9465, -1.0232], countryCode: 'gh', level: 'L2', churches: [ { coords: [5.6037, -0.1870], name: 'Accra Peace' }, { coords: [6.6885, -1.623], name: 'Kumasi Grace Church' } ] },
    { name: 'Mozambique', coords: [-18.6657, 35.5296], countryCode: 'mz', level: 'L2', churches: [{ coords: [-25.9655, 32.5832], name: 'Maputo Vineyard' }] },
    { name: 'Nepal', coords: [28.3949, 84.1240], countryCode: 'np', level: 'L3', churches: [ { coords: [27.7172, 85.3240], name: 'Kathmandu Church' }, { coords: [28.2, 83.98], name: 'Pokhara Lighthouse' } ] },
    { name: 'South Sudan', coords: [6.8769, 31.3069], countryCode: 'ss', level: 'L3', churches: [{ coords: [4.8594, 31.5713], name: 'Juba Fellowship' }] },
    { name: 'Sri Lanka', coords: [7.8731, 80.7718], countryCode: 'lk', level: 'L2', churches: [ { coords: [6.9271, 79.8612], name: 'Colombo Hope' }, { coords: [7.295, 80.636], name: 'Kandy Covenant Church' } ] },
    { name: 'Tanzania', coords: [-6.3690, 34.8888], countryCode: 'tz', level: 'L2', churches: [ { coords: [-6.1630, 35.7516], name: 'Dar es Salaam Church' }, { coords: [-3.387, 36.682], name: 'Arusha Mountain Church' } ] },
    { name: 'Uganda', coords: [1.3733, 32.2903], countryCode: 'ug', level: 'L2', churches: [ { coords: [0.3476, 32.5825], name: 'Kampala Light' }, { coords: [2.775, 32.299], name: 'Gulu Restoration Church' } ] }
];

// ── Dynamic Color Map ─────────────────────────────────────────────────────────
const levelColors = {
    'L1': '#10b981',         // Modern Green
    'L2': '#84cc16',         // Modern Light Green
    'L3': '#f59e0b',         // Modern Yellow
    'L4': '#ea580c',         // Modern Orange
    'inactive': '#94a3b8',   // Modern Slate
    'cancelled': '#ef4444',  // Modern Red
    'default': '#db5729'     // Brand Orange
};

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

// Custom Clean Dots replacing Flag Images
function createDotIcon(isSensitive = false) {
    const d = isSensitive ? 20 : 12; // Larger dots for sensitive
    return L.divIcon({
        html: `
        <div class="custom-dot-wrap" style="width:${d}px; height:${d}px;">
            <div class="custom-dot-inner" style="width:100%; height:100%;"></div>
        </div>`,
        iconSize: [d, d], iconAnchor: [d/2, d/2], className: ''
    });
}

// ── Sidebar & Accordion ───────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const sidebarContent = document.getElementById('sidebarContent');

function openSidebar(html) {
    sidebarContent.innerHTML = html;
    sidebar.classList.add('open');
    setupAccordions(sidebarContent);
}

function setupAccordions(container) {
    if (!container) return;
    container.querySelectorAll('.acc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const el = container.querySelector('#' + btn.dataset.target);
            if (!el) return;
            const isHidden = el.style.display === 'none' || el.style.display === '';
            el.style.display = isHidden ? 'block' : 'none';
            btn.classList.toggle('is-open', isHidden);
            
            // Toggle generic chevron
            const currentText = btn.innerHTML;
            if (isHidden) {
                btn.innerHTML = currentText.replace('▶', '▼');
            } else {
                btn.innerHTML = currentText.replace('▼', '▶');
            }
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

function generateChurchDetailsHTML(chName, uniqueId, expanded = false, showHeader = true) {
    const details = placeholderData.churchDetails[chName] || {};
    const staff = placeholderData.staffDetails[chName] || [];
    const displayStyle = expanded ? 'block' : 'none';
    const isOpenClass = expanded ? 'is-open' : '';
    const toggleIcon = expanded ? '▼' : '▶';

    let html = `<div class="accordion-wrapper">`;
    if (showHeader) {
        html += `<button class="acc-btn main-church-toggle ${isOpenClass}" data-target="church-wrap-${uniqueId}"><span>${chName}</span> <span>${toggleIcon}</span></button>`;
    }
    const wrapStyle = showHeader ? `display:${displayStyle};` : `display:block;`;
    const noBorderClass = showHeader ? 'acc-content' : '';

    html += `<div id="church-wrap-${uniqueId}" class="${noBorderClass}" style="${wrapStyle}">
            
            <button class="acc-btn is-open" data-target="cinfo-${uniqueId}" style="margin-bottom:0; border-bottom:none; background:transparent;"><span>Church Info</span> <span>▼</span></button>
            <div id="cinfo-${uniqueId}" style="display:block; padding: 0 16px 16px;">`;
    
    if (details.yearStarted) html += `<div class="data-row"><span class="data-label">Year started</span><span class="data-value">${details.yearStarted}</span></div>`;
    if (details.attendees) html += `<div class="data-row"><span class="data-label">Attendees</span><span class="data-value">${details.attendees}</span></div>`;
    if (details.leaders?.length) html += `<div class="data-row"><span class="data-label">Leaders</span><span class="data-value">${details.leaders.join(', ')}</span></div>`;
    if (details.parentChurch) html += `<div class="data-row"><span class="data-label">Parent church</span><span class="data-value">${details.parentChurch}</span></div>`;
    if (details.siblingChurches?.length) html += `<div class="data-row"><span class="data-label">Sibling churches</span><span class="data-value">${details.siblingChurches.join(', ')}</span></div>`;
    if (!details.yearStarted && !details.attendees) html += `<p class="no-data">No details on record yet.</p>`;
    html += `</div><hr style="margin:0;">`;

    html += `<button class="acc-btn is-open" data-target="sinfo-${uniqueId}" style="margin-bottom:0; border:none; background:transparent;"><span>Staff (${staff.length})</span> <span>▼</span></button>
             <div id="sinfo-${uniqueId}" style="display:block; padding: 0 16px 16px;">`;
    if (staff.length) {
        staff.forEach(s => {
            const pct = Math.round(((s.discipleshipLevel || 1) / 4) * 100);
            
            let discHtml = '';
            if (s.discipleship) {
                discHtml = `
                <div class="disc-milestones">
                    <span class="dm-badge dm-${s.discipleship.evangelism.toLowerCase()}">E: ${s.discipleship.evangelism}</span>
                    <span class="dm-badge dm-${s.discipleship.salvation.toLowerCase()}">S: ${s.discipleship.salvation}</span>
                    <span class="dm-badge dm-${s.discipleship.baptism.toLowerCase()}">B: ${s.discipleship.baptism}</span>
                </div>`;
            }

            html += `<div class="staff-card">
                <div class="staff-name">${s.name}</div>
                <div class="data-row"><span class="data-label">Year joined</span><span class="data-value">${s.yearJoined}</span></div>
                ${s.age ? `<div class="data-row"><span class="data-label">Age</span><span class="data-value">${s.age}</span></div>` : ''}
                <div class="data-row"><span class="data-label">Mentored by</span><span class="data-value">${s.mentoredBy || 'None'}</span></div>
                ${s.mentoring?.length ? `<div class="data-row"><span class="data-label">Mentoring</span><span class="data-value">${s.mentoring.join(', ')}</span></div>` : ''}
                ${discHtml}
                <div class="progress-wrap">
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#64748b;">
                        <span>Discipleship Level</span><span>${s.discipleshipLevel || 1}/4</span>
                    </div>
                    <div class="progress-bg"><div class="progress-fill" style="width:${pct}%;"></div></div>
                </div>
            </div>`;
        });
    } else {
        html += `<p class="no-data">No staff on record yet.</p>`;
    }
    html += `</div></div></div>`;
    return html;
}

function buildChurchSidebar(ch) {
    const sensitive = isIn1040Window(ch.coords);
    let notice = '';
    if (sensitive && pinSecurityMode === 'obfuscate') notice = `<div class="obscure-notice">📍 Pin location is approximate (Security)</div>`;
    else if (sensitive && pinSecurityMode === 'hidden') notice = `<div class="obscure-notice">🔒 Pin is hidden (Security)</div>`;
    let html = `<div class="sb-header"><h2>${ch.name}</h2></div>${notice}`;
    html += generateChurchDetailsHTML(ch.name, 'direct-pin', true, false);
    return html;
}

function buildCountrySidebar(country) {
    const stats  = placeholderData.countryStats[country.name] || { churches:0, groups:0, staff:0, volunteers:0 };
    const states = placeholderData.stateStats[country.name];
    let html = `<div class="sb-header"><h2>${country.name}</h2></div>
        <div class="stat-grid layout-2col">
          <div class="stat-card"><span class="stat-lbl">Churches</span><span class="stat-num">${stats.churches}</span></div>
          <div class="stat-card"><span class="stat-lbl">Groups</span><span class="stat-num">${stats.groups}</span></div>
          <div class="stat-card"><span class="stat-lbl">Staff</span><span class="stat-num">${stats.staff}</span></div>
          <div class="stat-card"><span class="stat-lbl">Volunteers</span><span class="stat-num">${stats.volunteers||0}</span></div>
        </div>`;

    if (states && Object.keys(states).length > 0) {
        html += `<hr><h3>Regional Breakdown</h3><div style="margin-top:12px;">`;
        for (const [name, data] of Object.entries(states)) {
            html += `<div style="margin-bottom: 24px;">
                        <div style="margin-bottom:8px;">
                            <strong style="color:var(--text-main); font-size:0.95rem;">${name}</strong>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${data.churches} churches · ${data.groups} groups · ${data.staff} staff</div>
                        </div>`;
            data.names.forEach((cName, idx) => {
                const safeStateName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                html += generateChurchDetailsHTML(cName, `country-${safeStateName}-${idx}`, false, true);
            });
            html += `</div>`;
        }
        html += `</div>`;
    } else {
        html += `<hr><h3>Churches</h3><div style="margin-top:12px;">`;
        country.churches.forEach((ch, idx) => {
            html += generateChurchDetailsHTML(ch.name, `country-direct-${idx}`, false, true);
        });
        html += `</div>`;
    }
    return html;
}

function buildStateSidebar(stateName, stateData) {
    let html = `<div class="sb-header"><h2>${stateName}</h2></div>`;
    if (stateData) {
        html += `<div class="stat-grid layout-2col">
          <div class="stat-card"><span class="stat-lbl">Churches</span><span class="stat-num">${stateData.churches}</span></div>
          <div class="stat-card"><span class="stat-lbl">Groups</span><span class="stat-num">${stateData.groups}</span></div>
          <div class="stat-card" style="grid-column: span 2;"><span class="stat-lbl">Staff</span><span class="stat-num">${stateData.staff}</span></div>
        </div>`;
        html += `<hr><h3>Churches</h3><div style="margin-top:12px;">`;
        stateData.names.forEach((cName, idx) => {
            html += generateChurchDetailsHTML(cName, `state-${idx}`, false, true);
        });
        html += `</div>`;
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

function renderSpecificChurchPins(churchesList) {
    churchMarkers.clearLayers();
    if (!churchesList) return;
    churchesList.forEach(ch => {
        const pos = resolveCoords(ch);
        if (pos === null) return;
        const sensitive = isIn1040Window(ch.coords);
        const m = L.marker(pos, { icon: createDotIcon(sensitive), title: ch.name });
        m.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            openSidebar(buildChurchSidebar(ch));
        });
        m.addTo(churchMarkers);
    });
}

function renderStateShapes(geoJsonData, countryData) {
    L.geoJSON(geoJsonData, {
        style: function() { return { color: '#cbd5e1', weight: 1, fillColor: '#94a3b8', fillOpacity: 0.2, className: 'state-shape' }; },
        onEachFeature: function(feature, layer) {
            layer.on('mouseover', function() { this.setStyle({ fillOpacity: 0.4 }); });
            layer.on('mouseout', function() { this.setStyle({ fillOpacity: 0.2 }); });
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
                renderSpecificChurchPins(churchesToRender);
                openSidebar(buildStateSidebar(matchedStateName || stateName, matchedStateData));
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
        
        style: function(feature) { 
            const countryData = activeCountries[feature.properties.name];
            const lvl = countryData.level || 'default';
            const col = levelColors[lvl] || levelColors['default'];

            return { 
                color: col, 
                weight: 1, 
                fillColor: col, 
                fillOpacity: 0.6, 
                className: 'country-shape' 
            }; 
        },
        
        onEachFeature: function(feature, layer) {
            const countryData = activeCountries[feature.properties.name];

            layer.on('mouseover', function() { this.setStyle({ fillOpacity: 0.85 }); });
            layer.on('mouseout', function() { this.setStyle({ fillOpacity: 0.6 }); });

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
                    renderSpecificChurchPins(countryData.churches);
                    const states = placeholderData.stateStats[countryData.name];
                    stateMarkers.clearLayers();
                    if (states) {
                        Object.entries(states).forEach(([name, data]) => {
                            const isSensitive = countryData.sensitive || false;
                            const m = L.marker(data.coords || countryData.coords, { icon: createDotIcon(isSensitive), title: name });
                            m.bindPopup(`<strong>${name}</strong><br>${data.churches} churches · ${data.groups} groups · ${data.staff} staff`);
                            m.addTo(stateMarkers);
                        });
                    }
                    openSidebar(buildCountrySidebar(countryData));
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
document.getElementById('globalOverviewBtn').onclick = (e) => { e.stopPropagation(); overviewModal.style.display = 'flex'; }
document.getElementById('closeOverview').onclick = () => { overviewModal.style.display = 'none'; }

const securityBtn = document.getElementById('obscurePinsBtn');
const securityPopup = document.getElementById('securityPopup');
const securityOpts = securityPopup.querySelectorAll('.sec-option');
const securityBtnText = document.getElementById('securityBtnText');

securityBtn.onclick = (e) => {
    e.stopPropagation();
    const opening = !securityPopup.classList.contains('open');
    securityPopup.classList.toggle('open', opening);
    securityBtn.classList.toggle('active', opening);
};

document.addEventListener('click', (e) => {
    if (!securityPopup.contains(e.target) && e.target !== securityBtn && !securityBtn.contains(e.target)) {
        securityPopup.classList.remove('open');
        securityBtn.classList.remove('active');
    }
    if (e.target === overviewModal) overviewModal.style.display = 'none';
});

function applySecurityMode(mode) {
    pinSecurityMode = (pinSecurityMode === mode) ? 'normal' : mode;
    securityOpts.forEach(o => o.classList.toggle('selected', o.dataset.mode === pinSecurityMode));
    
    const statusText = { normal: 'Security: Off', obfuscate: 'Security: Obfuscated', hidden: 'Security: Hidden' };
    securityBtnText.textContent = statusText[pinSecurityMode];
    
    securityPopup.classList.remove('open');
    securityBtn.classList.remove('active');

    if (currentStateChurches) renderSpecificChurchPins(currentStateChurches);
    else if (currentCountry) renderSpecificChurchPins(currentCountry.churches);
    else showAllCountries();
}

securityOpts.forEach(opt => opt.onclick = (e) => { e.stopPropagation(); applySecurityMode(opt.dataset.mode); });

// ── Forms Dashboard Page Logic ────────────────────────────────────────────────
const formsPage = document.getElementById('formsPage');
const formTabs = document.querySelectorAll('.form-tab');
const formSections = document.querySelectorAll('.form-section');

let addChurchMapInstance = null;
let addChurchMarker = null;

function populateFormDropdowns() {
    const countrySelect = document.getElementById('churchCountrySelect');
    const staffChurchSelect = document.getElementById('staffChurchSelect');
    const updateLevelCountrySelect = document.getElementById('updateLevelCountrySelect');
    
    countrySelect.innerHTML = '<option value="">-- Choose Country --</option>';
    staffChurchSelect.innerHTML = '<option value="">-- Choose Church --</option>';
    updateLevelCountrySelect.innerHTML = '<option value="">-- Choose Country --</option>';

    countries.forEach(c => {
        countrySelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        updateLevelCountrySelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        c.churches.forEach(ch => {
            staffChurchSelect.innerHTML += `<option value="${ch.name}">${ch.name} (${c.name})</option>`;
        });
    });
}

function initAddChurchMap() {
    if (!addChurchMapInstance) {
        addChurchMapInstance = L.map('addChurchMap', { minZoom: 1, maxZoom: 16, zoomControl: false, zoom: 2 }).setView([20, 0], 2);
        L.control.zoom({ position: 'bottomright' }).addTo(addChurchMapInstance);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(addChurchMapInstance);

        addChurchMapInstance.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            document.getElementById('addChurchLat').value = lat;
            document.getElementById('addChurchLng').value = lng;
            document.getElementById('selectedCoordsText').textContent = `Location Selected! (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;
            document.getElementById('selectedCoordsText').classList.add('active');

            if (addChurchMarker) addChurchMarker.setLatLng(e.latlng);
            else addChurchMarker = L.marker(e.latlng, {icon: createDotIcon(false)}).addTo(addChurchMapInstance);
        });
    } else {
        setTimeout(() => { addChurchMapInstance.invalidateSize(); }, 100);
    }
}

document.getElementById('churchCountrySelect').addEventListener('change', function() {
    const cName = this.value;
    if (!cName || !worldGeoJSON || !addChurchMapInstance) return;

    const searchName = geoJsonNameMap[cName] || cName;
    const feature = worldGeoJSON.features.find(f => f.properties.name.toLowerCase() === searchName.toLowerCase());
    
    if (feature) {
        const tempLayer = L.geoJSON(feature);
        addChurchMapInstance.fitBounds(tempLayer.getBounds(), { padding: [20, 20] });
    } else {
        const cObj = countries.find(c => c.name === cName);
        if (cObj) addChurchMapInstance.setView(cObj.coords, 5);
    }
});

document.getElementById('addDataBtn').onclick = () => {
    populateFormDropdowns();
    formsPage.style.display = 'block';
    if (!addChurchMapInstance) initAddChurchMap();
};

document.getElementById('closeFormsPage').onclick = () => {
    formsPage.style.display = 'none';
    showAllCountries();
};

formTabs.forEach(tab => {
    tab.onclick = () => {
        formTabs.forEach(t => t.classList.remove('active'));
        formSections.forEach(s => s.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
        
        if (tab.dataset.target === 'addChurchSection') {
            setTimeout(() => { if (addChurchMapInstance) addChurchMapInstance.invalidateSize(); }, 50);
        }
    };
});

function getChurchLocationData(churchName) {
    for (const c of countries) {
        if (c.churches.find(ch => ch.name === churchName)) {
            let stateName = 'Unknown';
            const states = placeholderData.stateStats[c.name];
            if (states) {
                for (const [sName, sData] of Object.entries(states)) {
                    if (sData.names.includes(churchName)) { stateName = sName; break; }
                }
            }
            return { country: c.name, state: stateName };
        }
    }
    return { country: null, state: null };
}

// 1. Add Country
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
            lat = center.lat; lng = center.lng;
        } else {
            alert(`Could not find borders for "${cName}". Please check the spelling (e.g., "Germany").`);
            return; 
        }
    } else {
        alert("Map data is still loading. Please try again in a moment.");
        return;
    }

    if (!countries.find(c => c.name.toLowerCase() === cName.toLowerCase())) {
        countries.push({ name: cName, coords: [lat, lng], countryCode: cCode, level: 'default', churches: [] });
        placeholderData.countryStats[cName] = { churches: 0, groups: 0, staff: 0, volunteers: 0 };
        placeholderData.stateStats[cName] = {};
        alert(`Successfully added Country: ${cName}`);
    } else {
        alert(`${cName} already exists!`);
    }
    this.reset();
    populateFormDropdowns();
});

// 2. Add Church
document.getElementById('formAddChurch').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const latStr = document.getElementById('addChurchLat').value;
    const lngStr = document.getElementById('addChurchLng').value;

    if (!latStr || !lngStr) return alert("Please click on the mini-map to drop a pin for the church location.");

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
    
    this.reset();
    document.getElementById('selectedCoordsText').textContent = "No location selected yet. Click the map!";
    document.getElementById('selectedCoordsText').classList.remove('active');
    if (addChurchMarker) { addChurchMapInstance.removeLayer(addChurchMarker); addChurchMarker = null; }
    document.getElementById('addChurchLat').value = '';
    document.getElementById('addChurchLng').value = '';
    
    populateFormDropdowns();
});

// 3. Add Staff 
document.getElementById('formAddStaff').addEventListener('submit', function(e) {
    e.preventDefault();
    const chName = document.getElementById('staffChurchSelect').value;
    const staffName = document.getElementById('addStaffName').value.trim();
    const age = document.getElementById('addStaffAge').value;
    const yearJoined = document.getElementById('addStaffYear').value;
    
    const eLvl = document.getElementById('addStaffEvangelism').value;
    const sLvl = document.getElementById('addStaffSalvation').value;
    const bLvl = document.getElementById('addStaffBaptism').value;

    const maxIdx = Math.max(dProgression.indexOf(eLvl), dProgression.indexOf(sLvl), dProgression.indexOf(bLvl));
    const overallLevel = maxIdx === 0 ? 1 : maxIdx;

    if (!placeholderData.staffDetails[chName]) placeholderData.staffDetails[chName] = [];
    
    placeholderData.staffDetails[chName].push({
        name: staffName, 
        yearJoined: yearJoined || new Date().getFullYear(), 
        age: age || null, 
        discipleship: { evangelism: eLvl, salvation: sLvl, baptism: bLvl },
        discipleshipLevel: overallLevel
    });

    const loc = getChurchLocationData(chName);
    if (loc.country) placeholderData.countryStats[loc.country].staff += 1;
    if (loc.country && loc.state && placeholderData.stateStats[loc.country][loc.state]) {
        placeholderData.stateStats[loc.country][loc.state].staff += 1;
    }

    alert(`Successfully added ${staffName} to ${chName}`);
    this.reset();
});

// 4. Update Country Status
document.getElementById('formUpdateLevel').addEventListener('submit', function(e) {
    e.preventDefault();
    const cName = document.getElementById('updateLevelCountrySelect').value;
    const newLvl = document.getElementById('updateLevelSelect').value;

    const countryObj = countries.find(c => c.name === cName);
    if (!countryObj) return alert("Country not found");

    countryObj.level = newLvl;
    
    alert(`Successfully updated ${cName} status to ${newLvl}!`);
    showAllCountries();
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
        e.target.textContent = vis ? 'Hide List' : 'View List';
    });
}

renderGlobalDashboard();