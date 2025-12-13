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

let map, userMarker, issMarker;

function initMap(lat, lon) {
    if (!map) {
        map = L.map('map', {
            minZoom:1
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

const getISSLocation = async (latitude, longitude) => {
    try {
        // Use the /n2yo/ prefix as required by the backend
        const url = `${PROXY_BASE}/n2yo/satellite/positions/25544/${latitude}/${longitude}/0/1`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            // ISS position is in data.positions[0]
            const issLat = data.positions[0].satlatitude;
            const issLon = data.positions[0].satlongitude;
            document.getElementById('output').innerHTML =
                `ISS Position: Latitude ${issLat}, Longitude ${issLon}`;
            showISSOnMap(issLat, issLon);
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
                getISSVisualPass(lat, lon);
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
        getISSVisualPass(lat, lon);
    };
});

