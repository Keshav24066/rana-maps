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
const selectedPlaceInfo = document.getElementById('selectedPlaceInfo');

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

function setSelectedPlaceInfo(place) {
  if (!place) {
    selectedPlaceInfo.textContent = 'No place selected';
    return;
  }

  const name = place.name || 'Selected place';
  selectedPlaceInfo.textContent = `${name} • ${place.lat.toFixed(4)}, ${place.lng?.toFixed(4) || place.lon?.toFixed(4)}`;
}

function setCurrentLocation(lat, lng, label = 'Current Location') {
  currentLocation = { lat, lng, name: label };
  if (userMarker) map.removeLayer(userMarker);

  userMarker = L.marker([lat, lng], { icon: buildCustomPin('#3b82f6') })
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
    createMarker: () => null,
    lineOptions: {
      styles: [{ color: '#3b82f6', opacity: 0.8, weight: 5 }]
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
    icon: buildCustomPin('#22c55e')
  }).addTo(map).bindPopup(result.display_name || result.name || 'Selected location');

  map.setView([result.lat, result.lon], 14);
}

async function searchPlaces(query) {
  const q = query.trim();
  if (!q) {
    resultsList.innerHTML = '<div class="empty-state">Type a place name to search.</div>';
    return;
  }

  resultsList.innerHTML = '<div class="empty-state">Searching...</div>';

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`;
    const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });

    if (!response.ok) throw new Error('Search failed');

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

      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        selectedPlace = {
          lat: Number(item.lat),
          lon: Number(item.lon),
          name: item.display_name.split(',')[0].trim() || 'Selected place'
        };

        setSelectedPlaceInfo(selectedPlace);
        addPlaceMarker(selectedPlace);

        if (currentLocation) {
          drawRoute(currentLocation, selectedPlace);
        }
      });

      wrapper.appendChild(title);
      wrapper.appendChild(subtitle);
      wrapper.appendChild(openBtn);
      resultsList.appendChild(wrapper);
    });
  } catch (error) {
    resultsList.innerHTML = '<div class="empty-state">Unable to load results right now.</div>';
    console.error(error);
  }
}

function renderSavedLocations() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  if (!saved.length) {
    savedPlacesList.innerHTML = '<div class="empty-state">No saved places yet.</div>';
    return;
  }

  savedPlacesList.innerHTML = '';

  saved.forEach((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'saved-item';

    const strong = document.createElement('strong');
    strong.textContent = item.name;

    const meta = document.createElement('small');
    meta.textContent = `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`;

    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', () => {
      const loc = { lat: item.lat, lng: item.lng, name: item.name };
      selectedPlace = loc;
      setSelectedPlaceInfo(loc);

      if (placeMarker) map.removeLayer(placeMarker);
      placeMarker = L.marker([loc.lat, loc.lng], { icon: buildCustomPin('#22c55e') })
        .addTo(map)
        .bindPopup(loc.name);
      map.setView([loc.lat, loc.lng], 14);

      if (currentLocation) drawRoute(currentLocation, loc);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', () => {
      const updated = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').filter((x) => x.id !== item.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      renderSavedLocations();
    });

    wrapper.appendChild(strong);
    wrapper.appendChild(meta);
    wrapper.appendChild(openBtn);
    wrapper.appendChild(deleteBtn);
    savedPlacesList.appendChild(wrapper);
  });
}

function saveLocation() {
  const value = selectedPlace || currentLocation;
  if (!value) {
    alert('Select a place or use your current location first.');
    return;
  }

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  const newItem = {
    id: Date.now(),
    name: value.name || 'Saved Place',
    lat: Number(value.lat),
    lng: Number(value.lng ?? value.lon)
  };

  saved.unshift(newItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  renderSavedLocations();
  alert('Location saved.');
}

function useMyLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported in this browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCurrentLocation(lat, lng, 'Your location');
      selectedPlace = currentLocation;
      setSelectedPlaceInfo(selectedPlace);
    },
    () => {
      alert('Location access was denied.');
    }
  );
}

searchBtn.addEventListener('click', () => searchPlaces(searchInput.value));
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') searchPlaces(searchInput.value);
});
useMyLocationBtn.addEventListener('click', useMyLocation);
saveLocationBtn.addEventListener('click', saveLocation);

initMap();
renderSavedLocations();
setSelectedPlaceInfo(null);

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setCurrentLocation(pos.coords.latitude, pos.coords.longitude, 'Your location');
      selectedPlace = currentLocation;
      setSelectedPlaceInfo(selectedPlace);
    },
    () => {
      setCurrentLocation(28.6139, 77.209, 'Delhi');
      selectedPlace = currentLocation;
      setSelectedPlaceInfo(selectedPlace);
    }
  );
} else {
  setCurrentLocation(28.6139, 77.209, 'Delhi');
  selectedPlace = currentLocation;
  setSelectedPlaceInfo(selectedPlace);
}
