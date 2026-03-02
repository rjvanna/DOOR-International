# World Map Project

An interactive, 100% accurate world map with real country borders and boundaries.

## Features

- **100% Accurate Country Borders**: Uses OpenStreetMap data for precise boundaries
- **Interactive Zoom & Pan**: Explore countries at different zoom levels
- **Real Tile Maps**: OpenStreetMap tiles for authentic geographic visualization
- **Country Borders Layer**: Displays exact country boundaries with clean styling
- **Pinned Countries**: Custom flag markers for selected countries (US, Kenya, India, Russia, Nigeria and additional nations including Bulgaria, Burundi, Egypt, Ethiopia, Ghana, Mozambique, Nepal, South Sudan, Sri Lanka, Tanzania, Uganda)
- **Sliding Info Sidebar**: Clicking a pin opens a menu on the right with details instead of map popups
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Coordinates Display**: Shows latitude and longitude when hovering over the map
- **Scale Control**: Visual scale indicator for distance reference

## Technology

- **Leaflet.js**: Lightweight, open-source mapping library
- **OpenStreetMap**: Authoritative geographic data and tiles
- **Leaflet Country Borders**: Plugin for accurate country boundary visualization
- **HTML5/CSS3**: Modern responsive design

## Files

- `index.html` - Main HTML file with Leaflet map setup
- `styles.css` - Styling and responsive layout
- `script.js` - Interactive map functionality
- `README.md` - Documentation

## How to Use

1. Open `index.html` in your web browser
2. **Zoom**: Use mouse scroll or the zoom controls (top-right)
3. **Pan**: Click and drag to move around the map
4. **Explore**: Hover over locations to see coordinates
5. **Click**: Click anywhere on the map to select a location

## Map Features

- **Accurate Borders**: All 195 countries with precise boundaries
- **Zoom Levels**: From 2x global view to 19x street level
- **Attribution**: OpenStreetMap contributors properly credited
- **Scale Display**: Bottom-left corner shows distance scale

## Browser Support

Works in all modern browsers that support:
- ES6 JavaScript
- CSS3 Flexbox & Grid
- Leaflet.js compatible browsers

## Data Sources

- **Map Tiles**: © OpenStreetMap contributors (ODbL license)
- **Country Borders**: Authoritative geographic data
- **Projection**: Web Mercator (EPSG:3857)

## Customization

You can easily modify:
- **Tile Provider**: Change the OpenStreetMap URL to use other providers
- **Starting Location**: Adjust the `setView([20, 0], 2)` coordinates
- **Styling**: Update CSS to change color schemes
- **Zoom Range**: Modify maxZoom/minZoom settings
