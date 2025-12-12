// Proxy base: point this to your running proxy. Default assumes local dev server at port 3000.
const PROXY_BASE = 'https://api-project-xcg2.onrender.com';

let map, userMarker, issMarker;

function initMap(lat, lon) {
    if (!map) {
        map = L.map('map').setView([lat, lon], 3);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    } else {
        map.setView([lat, lon], 3);
    }
    if (userMarker) {
        userMarker.setLatLng([lat, lon]);
    } else {
        userMarker = L.marker([lat, lon], {title: 'Your Location'}).addTo(map);
    }
}

function showISSOnMap(issLat, issLon) {
    if (issMarker) {
        issMarker.setLatLng([issLat, issLon]);
    } else {
        issMarker = L.marker([issLat, issLon], {title: 'ISS'}).addTo(map);
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
                initMap(loc.lat, loc.lon);
                document.getElementById('output').innerHTML = `Converted address to: Latitude ${loc.lat}, Longitude ${loc.lon}`;
            } else {
                document.getElementById('output').innerHTML = 'Address not found.';
            }
        }
    };

    document.getElementById('iss-btn').onclick = () => {
        lat = parseFloat(latInput.value);
        lon = parseFloat(lonInput.value);
        initMap(lat, lon);
        getISSLocation(lat, lon);
    };
});

