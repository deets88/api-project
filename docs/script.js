// Fetch and display next ISS visual pass info
const getISSVisualPass = async (latitude, longitude) => {
    try {
        // Use the /n2yo/ prefix as required by the backend
        // 25544 is the NORAD id for the ISS
        // observer_alt is set to 0 (sea level), days=5, min_visibility=300
        const url = `${PROXY_BASE}/n2yo/satellite/visualpasses/25544/${latitude}/${longitude}/0/10/300`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            // Debug: show raw API response
                // Debug: show raw API response (removed)
            if (data.passes && data.passes.length > 0) {
                const nextPass = data.passes[0];
                // nextPass.startUTC is a Unix timestamp (seconds)
                const dateObj = new Date(nextPass.startUTC * 1000);
                const dateStr = dateObj.toLocaleDateString();
                const timeStr = dateObj.toLocaleTimeString();
                const durationMin = Math.round(nextPass.duration / 60);
                
                // Calculate days from now
                const now = new Date();
                const diffTime = dateObj - now;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                let whenText;
                if (diffDays === 0) {
                    whenText = 'today';
                } else if (diffDays === 1) {
                    whenText = 'tomorrow';
                } else {
                    whenText = `in ${diffDays} days`;
                }
                
                document.getElementById('output').innerHTML += `<br>The ISS will next be visible at your location <b>${whenText}</b> (${dateStr}) at <b>${timeStr}</b> local time for <b>${durationMin}</b> minutes. Keep an eye out for it!`;
            } else {
                document.getElementById('output').innerHTML += '<br>No visible ISS passes in the next 5 days.';
            }
        } else {
            document.getElementById('output').innerHTML += '<br>Error fetching visual pass info: ' + response.status;
            // Debug: show error response text
            const errorText = await response.text();
            document.getElementById('output').innerHTML += `<br><pre style="background:#fee;max-width:100%;overflow:auto;">${errorText}</pre>`;
        }
    } catch (error) {
        document.getElementById('output').innerHTML += '<br>Error: ' + error;
    }
};
// Proxy base: point this to your running proxy. Default assumes local dev server at port 3000.
const PROXY_BASE = 'https://api-project-xcg2.onrender.com';

let map, userMarker, issMarker, issVisibilityCircle, issPathLine, issArrows = [];

function initMap(lat, lon) {
    if (!map) {
        map = L.map('map', {
            maxBounds: [[-90, -180], [90, 180]],
            maxBoundsViscosity: 1.0,
            minZoom: 2
        }).setView([lat, lon], 2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
            noWrap: false,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(map);
    }
    if (userMarker) {
        userMarker.setLatLng([lat, lon]);
    } else {
        const houseIcon = L.divIcon({
            html: '🏠',
            className: 'custom-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        userMarker = L.marker([lat, lon], {icon: houseIcon, title: 'Your Location'}).addTo(map);
    }
}

function showISSOnMap(issLat, issLon) {
    if (issMarker) {
        issMarker.setLatLng([issLat, issLon]);
    } else {
        const issIcon = L.divIcon({
            html: '🛰️',
            className: 'custom-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        issMarker = L.marker([issLat, issLon], {icon: issIcon, title: 'ISS'}).addTo(map);
    }
    
    // Remove previous visibility circle if it exists
    if (issVisibilityCircle) {
        map.removeLayer(issVisibilityCircle);
    }
    
    // Add visibility circle (ISS is visible within ~2200km radius)
    issVisibilityCircle = L.circle([issLat, issLon], {
        radius: 2200000, // 2200 km in meters
        color: '#ffe066',
        fillColor: '#ffe066',
        fillOpacity: 0.3,
        weight: 2,
        dashArray: '5, 10'
    }).addTo(map);
}

async function geocodeAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
}

// Draw ISS future path with arrows
function drawISSPath(positions) {
    // Remove previous path and arrows if they exist
    if (issPathLine) {
        map.removeLayer(issPathLine);
    }
    issArrows.forEach(arrow => map.removeLayer(arrow));
    issArrows = [];
    
    // Convert positions to [lat, lon] pairs
    const latlngs = positions.map(pos => [pos.satlatitude, pos.satlongitude]);
    
    // Create polyline
    issPathLine = L.polyline(latlngs, {
        color: '#00ffff',
        weight: 3,
        opacity: 0.7
    }).addTo(map);
    
    // Add arrows at intervals along the path
    const arrowInterval = Math.max(Math.floor(positions.length / 5), 1); // 5 arrows along the path
    for (let i = arrowInterval; i < positions.length; i += arrowInterval) {
        const pos1 = positions[i - 1];
        const pos2 = positions[i];
        const lat1 = pos1.satlatitude;
        const lon1 = pos1.satlongitude;
        const lat2 = pos2.satlatitude;
        const lon2 = pos2.satlongitude;
        
        // Calculate bearing for arrow rotation
        const angle = Math.atan2(lon2 - lon1, lat2 - lat1) * (180 / Math.PI);
        
        // Create arrow marker
        const arrowIcon = L.divIcon({
            html: `<div style="transform: rotate(${angle}deg); font-size: 20px; line-height: 1; color: #00ffff;">▶</div>`,
            className: 'arrow-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        const arrowMarker = L.marker([lat2, lon2], { icon: arrowIcon }).addTo(map);
        issArrows.push(arrowMarker);
    }
}

// Draw ISS future path with arrows
function drawISSPath(positions) {
    // Remove previous path and arrows if they exist
    if (issPathLine) {
        if (Array.isArray(issPathLine)) {
            issPathLine.forEach(line => map.removeLayer(line));
        } else {
            map.removeLayer(issPathLine);
        }
    }
    issArrows.forEach(arrow => map.removeLayer(arrow));
    issArrows = [];
    
    // Split path into segments when crossing map edge (longitude wrap)
    const segments = [];
    let currentSegment = [];
    
    for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        currentSegment.push([pos.satlatitude, pos.satlongitude]);
        
        // Check if next position wraps around (large longitude jump)
        if (i < positions.length - 1) {
            const nextPos = positions[i + 1];
            const lonDiff = Math.abs(nextPos.satlongitude - pos.satlongitude);
            
            // If longitude difference is large (> 180), we're wrapping
            if (lonDiff > 180) {
                segments.push(currentSegment);
                currentSegment = [];
            }
        }
    }
    
    // Add final segment
    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }
    
    // Draw each segment as a separate polyline
    issPathLine = [];
    segments.forEach(segment => {
        if (segment.length > 1) {
            const line = L.polyline(segment, {
                color: '#ff0000',
                weight: 3,
                opacity: 0.7
            }).addTo(map);
            issPathLine.push(line);
        }
    });
    
    // Add arrows at intervals along the path
    const arrowInterval = Math.max(Math.floor(positions.length / 5), 1);
    for (let i = arrowInterval; i < positions.length; i += arrowInterval) {
        const pos1 = positions[i - 1];
        const pos2 = positions[i];
        const lat1 = pos1.satlatitude;
        const lon1 = pos1.satlongitude;
        const lat2 = pos2.satlatitude;
        const lon2 = pos2.satlongitude;
        
        // Skip arrows at wrap points
        const lonDiff = Math.abs(lon2 - lon1);
        if (lonDiff > 180) continue;
        
        // Calculate bearing for arrow rotation
        const angle = Math.atan2(lon2 - lon1, lat2 - lat1) * (180 / Math.PI);
        
        // Create arrow marker
        const arrowIcon = L.divIcon({
            html: `<div style="transform: rotate(${angle}deg); font-size: 20px; line-height: 1; color: #ff0000;">▶</div>`,
            className: 'arrow-icon',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        const arrowMarker = L.marker([lat2, lon2], { icon: arrowIcon }).addTo(map);
        issArrows.push(arrowMarker);
    }
}

// Reverse geocode to get location name from coordinates
async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=3`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data && data.address) {
            // Try to get the most relevant location name
            if (data.address.country) {
                return data.address.country;
            } else if (data.address.ocean) {
                return `the ${data.address.ocean}`;
            } else if (data.address.sea) {
                return `the ${data.address.sea}`;
            } else if (data.display_name) {
                // Parse display_name for ocean names
                const displayName = data.display_name.toLowerCase();
                if (displayName.includes('pacific')) return 'the Pacific Ocean';
                if (displayName.includes('atlantic')) return 'the Atlantic Ocean';
                if (displayName.includes('indian')) return 'the Indian Ocean';
                if (displayName.includes('arctic')) return 'the Arctic Ocean';
                if (displayName.includes('southern')) return 'the Southern Ocean';
                return data.display_name.split(',')[0];
            }
        }
        return 'an unknown location';
    } catch (error) {
        return 'an unknown location';
    }
}

const getISSLocation = async (latitude, longitude) => {
    try {
        // Use the /n2yo/ prefix as required by the backend
        // Get positions for the next 93 mins (5580 seconds)
        const url = `${PROXY_BASE}/n2yo/satellite/positions/25544/${latitude}/${longitude}/0/5580`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            // ISS position is in data.positions[0]
            const issLat = data.positions[0].satlatitude;
            const issLon = data.positions[0].satlongitude;
            
            // Get location name for ISS position
            const locationName = await reverseGeocode(issLat, issLon);
            
            // Clear output and set ISS position info
            document.getElementById('output').innerHTML =
                `ISS Position: Latitude ${issLat}, Longitude ${issLon}<br>Right now, the ISS is passing over <b>${locationName}</b>.`;
            showISSOnMap(issLat, issLon);
            
            // Draw the ISS future path with arrows
            if (data.positions && data.positions.length > 1) {
                drawISSPath(data.positions);
            }
            
            // Now fetch visual pass info (which will append to the output)
            await getISSVisualPass(latitude, longitude);
            
            // Fit bounds to show both user and ISS markers
            const bounds = L.latLngBounds(
                [latitude, longitude],
                [issLat, issLon]
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            document.getElementById('output').innerHTML = 'Error: ' + response.status;
        }
    } catch (error) {
        document.getElementById('output').innerHTML = 'Error: ' + error;
    }
};

window.addEventListener('DOMContentLoaded', () => {
    // Set default location
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    let lat = parseFloat(latInput.value);
    let lon = parseFloat(lonInput.value);
    initMap(lat, lon);

    document.getElementById('geocode-btn').onclick = async () => {
        const address = document.getElementById('address').value;
        if (address) {
            const loc = await geocodeAddress(address);
            if (loc) {
                latInput.value = loc.lat;
                lonInput.value = loc.lon;
                lat = loc.lat;
                lon = loc.lon;
                initMap(lat, lon);
                document.getElementById('output').innerHTML = `Converted address to: Latitude ${loc.lat}, Longitude ${loc.lon}`;
                // Also fetch ISS data
                getISSLocation(lat, lon);
            } else {
                document.getElementById('output').innerHTML = 'Address not found.';
            }
        }
    };

    document.getElementById('iss-btn').onclick = () => {
        lat = parseFloat(latInput.value);
        lon = parseFloat(lonInput.value);
        if (userMarker) {
            userMarker.setLatLng([lat, lon]);
        }
        getISSLocation(lat, lon);
    };
});

