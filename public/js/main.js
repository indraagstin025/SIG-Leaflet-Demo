// public/js/main.js (VERSI FULLSTACK)

const API_URL = 'https://sig-leaflet-demo-production.up.railway.app/api/locations';

window.onload = function () {
  const DEFAULT_CENTER = [-6.917, 107.619];
  const DEFAULT_ZOOM = 13;

  let map;
  let allLocations = [];
  let tempCoords = null;
  let tempMarker = null;
  let currentlyEditingId = null; 

  const modal = document.getElementById("location-modal");
  const form = document.getElementById("location-form");
  const cancelBtnModal = document.getElementById("cancel-btn-modal");
  const locNameInput = document.getElementById("loc-name");
  const locDescInput = document.getElementById("loc-desc");
  const locImgInput = document.getElementById("loc-img");

  // --- 1. FUNGSI KOMUNIKASI KE BACKEND ---
  
  async function fetchLocations() {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      allLocations = data;
      renderMapMarkers();
    } catch (error) {
      console.error("Gagal ambil data:", error);
    }
  }

  async function saveLocationToDB(payload) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await response.json();
  }

  async function updateLocationInDB(id, payload) {
    await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
  }

  async function deleteLocationFromDB(id) {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  }

  // --- 2. LOGIKA MAP ---

  function initializeMap() {
    map = L.map("map", {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      touchZoom: false,
      tap: false,
    });
    
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors, © CartoDB",
      maxZoom: 19,
    }).addTo(map);

    // Tambahkan tombol Custom Control (Find Me & Reset) jika perlu
    if (typeof L.Control.CustomButtons !== 'undefined') {
       new L.Control.CustomButtons({ position: "topleft" }).addTo(map);
    }
  }

  function renderMapMarkers() {
    // Bersihkan marker lama
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Loop data dari Database
    allLocations.forEach(loc => {
        // Jika bukan default, anggap favorit
        const isFavorite = !loc.isDefault; 
        addMarkerToMap(map, loc, isFavorite);
    });
  }

  // Jalankan inisialisasi
  initializeMap();
  initializeIcons(); // Dari utils.js
  fetchLocations();  // AMBIL DATA DARI DATABASE SAAT PERTAMA LOAD

  // --- 3. EVENT HANDLER (MODAL) ---

  window.openFavoriteModal = function (lat, lng, name, desc) {
    map.closePopup();
    if (tempMarker) map.removeLayer(tempMarker);
    tempCoords = [lat, lng];
    
    form.reset();
    locNameInput.value = name;
    locDescInput.value = desc || "";
    document.querySelector("#location-modal h3").innerText = "Simpan Lokasi Baru 📌";
    modal.classList.remove("hidden");
    locNameInput.focus();
  };

  window.openEditModal = function (lat, lng) {
    map.closePopup();
    // Cari lokasi berdasarkan koordinat
    const locationToEdit = allLocations.find((loc) => 
        Math.abs(loc.coords[0] - lat) < 0.00001 && 
        Math.abs(loc.coords[1] - lng) < 0.00001
    );
    
    if (!locationToEdit) return;

    currentlyEditingId = locationToEdit.id;
    
    form.reset();
    locNameInput.value = locationToEdit.name;
    locDescInput.value = locationToEdit.desc || "";
    document.querySelector("label[for='loc-img']").innerText = "Ganti Foto (Opsional):";
    document.querySelector("#location-modal h3").innerText = "Edit Lokasi Favorit ✏️";
    modal.classList.remove("hidden");
  };

  window.deleteLocation = async function (lat, lng) {
    map.closePopup();
    if (!confirm("Hapus lokasi ini dari database permanen?")) return;

    const locationToDelete = allLocations.find((loc) => 
        Math.abs(loc.coords[0] - lat) < 0.00001 && 
        Math.abs(loc.coords[1] - lng) < 0.00001
    );
    
    if (!locationToDelete) return;

    await deleteLocationFromDB(locationToDelete.id);
    alert("Data berhasil dihapus dari Database.");
    fetchLocations(); // Refresh map
  };

  cancelBtnModal.addEventListener("click", function () {
    modal.classList.add("hidden");
    form.reset();
    if (tempMarker) map.removeLayer(tempMarker);
    currentlyEditingId = null;
    tempCoords = null;
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = locNameInput.value;
    const desc = locDescInput.value;
    const file = locImgInput.files[0];

    const getBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    };

    let imgBase64 = null;
    if (file) {
      imgBase64 = await getBase64(file);
    }

    if (currentlyEditingId) {
      // UPDATE
      const payload = { name, desc };
      if (imgBase64) payload.img = imgBase64;
      await updateLocationInDB(currentlyEditingId, payload);
      alert("Database diperbarui!");
    } else {
      // CREATE
      if (!tempCoords) return;
      const payload = {
        name,
        desc,
        coords: tempCoords,
        img: imgBase64,
        category: "user_custom" 
      };
      await saveLocationToDB(payload);
      alert("Tersimpan di Database!");
    }

    modal.classList.add("hidden");
    form.reset();
    currentlyEditingId = null;
    tempCoords = null;
    if (tempMarker) map.removeLayer(tempMarker);
    
    fetchLocations(); // Refresh data dari server
  });

  // Klik peta untuk tambah manual
  map.on("click", function (e) {
    if (currentlyEditingId) return;
    map.closePopup();

    tempCoords = [e.latlng.lat, e.latlng.lng];
    if (tempMarker) map.removeLayer(tempMarker);

    // Pakai icon default Leaflet jika customIcons belum load
    const defaultIcon = typeof customIcons !== 'undefined' && customIcons.default ? customIcons.default : new L.Icon.Default();
    tempMarker = L.marker(tempCoords, { icon: defaultIcon }).addTo(map);

    form.reset();
    locNameInput.value = "Lokasi Baru";
    document.querySelector("#location-modal h3").innerText = "Tambahkan ke DB 📌";
    modal.classList.remove("hidden");
    locNameInput.focus();
  });
  
  // Geocoder (opsional, biarkan jika sudah ada kode sebelumnya)
    if (typeof L.Control.Geocoder !== 'undefined') {
        var geocoder = L.Control.geocoder({
            defaultMarkGeocode: false,
            placeholder: "Cari lokasi...",
        }).addTo(map);
        geocoder.on("markgeocode", function (e) {
            map.fitBounds(e.geocode.bbox);
        });
    }
};