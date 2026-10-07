const STORAGE_KEY = 'ranaMapsSavedLocations';

let map;
let currentLocation = null;
let selectedPlace = null;
let routeControl = null;
let userMarker = null;
let placeMarker = null;

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const useMyLocationBtn = document.getElementById('useMyLocationBtn');
const saveLocationBtn = document.getElementById('saveLocationBtn');
const resultsList = document.getElementById('searchResults');
const savedPlacesList = document.getElementById('savedPlaces');

function initMap() {
  map = L.map('map').setView([28.6139, 77.209], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function buildCustomPin(color) {
  return L.divIcon({
    className: 'custom-pin-wrapper',
    html: `<div class="custom-pin" style="background:${color};"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
}

function setCurrentLocation(lat, lng, label = 'Current Location') {
  currentLocation = { lat, lng, name: label };

  if (userMarker) {
    map.removeLayer(userMarker);
  }

  userMarker = L.marker([lat, lng], { icon: buildCustomPin('#2d7ff9') })
    .addTo(map)
    .bindPopup(label);

  map.setView([lat, lng], 14);
}

function clearRoute() {
  if (routeControl) {
    map.removeControl(routeControl);
    routeControl = null;
  }
}

function drawRoute(start, end) {
  clearRoute();

  routeControl = L.Routing.control({
    waypoints: [
      L.latLng(start.lat, start.lng),
      L.latLng(end.lat, end.lng)
    ],
    createMarker: function() { return null; },
    lineOptions: {
      styles: [{ color: '#2d7ff9', opacity: 0.8, weight: 5 }]
    },
    show: false,
    addWaypoints: false,
    routeWhileDragging: false,
    draggableWaypoints: false,
    collapse: true,
    fitSelectedRoutes: true,
    language: 'en'
  }).addTo(map);
}

function addPlaceMarker(result) {
  if (placeMarker) {
    map.removeLayer(placeMarker);
  }

  placeMarker = L.marker([result.lat, result.lon], {
    icon: buildCustomPin('#28c76f')
  })
    .addTo(map)
    .bindPopup(result.display_name || result.name || 'Selected location');

  map.setView([result.lat, result.lon], 14);
}

async function searchPlaces(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    resultsList.innerHTML = '<div class="empty-state">Type a place name to search.</div>';
    return;
  }

  resultsList.innerHTML = '<div class="empty-state">Searching...</div>';

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=5`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();

    if (!data.length) {
      resultsList.innerHTML = '<div class="empty-state">No results found.</div>';
      return;
    }

    resultsList.innerHTML = '';

    data.forEach((item) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'result-item';

      const title = document.createElement('strong');
      title.textContent = item.display_name.split(',')[0].trim() || 'Place';

      const subtitle = document.createElement('small');
      subtitle.textContent = item.display_name;

      const useBtn = document.createElement('button');
      useBtn.textContent = 'Open';
      useBtn.addEventListener('click', () => {
        selectedPlace = {
          lat: Number(item.lat),
          lon: Number(item.lon),
          name: item.display_name.split(',')[0].trim() || 'Selected place'
        };

        addPlaceMarker(selectedPlace);

        if (currentLocation) {
          drawRoute(currentLocation, selectedPlace);
        }
      });

      wrapper.appendChild(title);
      wrapper.appendChild(subtitle);
      wrapper.appendChild(useBtn);
      resultsList.appendChild(wrapper);
    });
  } catch (error) {
    resultsList.innerHTML = '<div class="empty-state">Unable to load results right now.</div>';
    console.error(error);
  }
}

function saveLocation() {
  const locationToSave = selectedPlace || currentLocation;

  if (!locationToSave) {
    alert('Choose a location first or use your current location.');
    return;
  }

  const newLocation = {
    id: Date.now(),
    name: locationToSave.name || 'Saved Location',
    lat: Number(locationToSave.lat ?? locationToSave.latitude),
    lng: Number(locationToSave.lng ?? locationToSave.longitude ?? locationToSave.lon),
    savedAt: new Date().toISOString()
  };

  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  existing.unshift(newLocation);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  renderSavedLocations();
  alert('Location saved successfully.');
}

function renderSavedLocations() {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  if (!existing.length) {
    savedPlacesList.innerHTML = '<div class="empty-state">No saved places yet. Save a location to view it here.</div>';
    return;
  }

  savedPlacesList.innerHTML = '';

  existing.forEach((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'saved-item';

    const name = document.createElement('strong');
    name.textContent = item.name;

    const meta = document.createElement('small');
    meta.textContent = `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`;

    const useBtn = document.createElement('button');
    useBtn.textContent = 'Open';
    useBtn.addEventListener('click', () => {
      const loc = { lat: item.lat, lng: item.lng, name: item.name };
      selectedPlace = loc;
      if (placeMarker) map.removeLayer(placeMarker);
      placeMarker = L.marker([loc.lat, loc.lng], { icon: buildCustomPin('#28c76f') })
        .addTo(map)
        .bindPopup(loc.name);
      map.setView([loc.lat, loc.lng], 14);

      if (currentLocation) {
        drawRoute(currentLocation, loc);
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', () => {
      const filtered = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter((x) => x.id !== item.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      renderSavedLocations();
    });

    wrapper.appendChild(name);
    wrapper.appendChild(meta);
    wrapper.appendChild(useBtn);
    wrapper.appendChild(deleteBtn);
    savedPlacesList.appendChild(wrapper);
  });
}

function useMyLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported in this browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setCurrentLocation(position.coords.latitude, position.coords.longitude, 'Your location');
      selectedPlace = currentLocation;
    },
    () => {
      alert('Location access was denied. Please allow access to use current location.');
    }
  );
}

searchBtn.addEventListener('click', () => {
  searchPlaces(searchInput.value);
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    searchPlaces(searchInput.value);
  }
});

useMyLocationBtn.addEventListener('click', useMyLocation);
saveLocationBtn.addEventListener('click', saveLocation);

initMap();
renderSavedLocations();

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCurrentLocation(lat, lng, 'Your location');
      selectedPlace = currentLocation;
    },
    () => {
      setCurrentLocation(28.6139, 77.209, 'Delhi');
    }
  );
} else {
  setCurrentLocation(28.6139, 77.209, 'Delhi');
}
