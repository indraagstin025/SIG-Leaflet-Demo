let customIcons = {};

/**
 * Mendefinisikan dan menginisialisasi semua objek L.AwesomeMarkers.icon. (Sama)
 */
function initializeIcons() {
  if (typeof L.AwesomeMarkers === "undefined") {
    console.warn("Leaflet.AwesomeMarkers belum dimuat. Menggunakan ikon Leaflet standar.");
    return;
  }
  customIcons = {
    hospital: L.AwesomeMarkers.icon({ icon: "heart-pulse", prefix: "fa", markerColor: "red", iconColor: "white" }),
    government: L.AwesomeMarkers.icon({ icon: "landmark", prefix: "fa", markerColor: "darkblue", iconColor: "white" }),
    public_space: L.AwesomeMarkers.icon({ icon: "tree", prefix: "fa", markerColor: "green", iconColor: "white" }),
    tourism: L.AwesomeMarkers.icon({ icon: "camera", prefix: "fa", markerColor: "orange", iconColor: "white" }),
    default: L.AwesomeMarkers.icon({ icon: "map-pin", prefix: "fa", markerColor: "blue", iconColor: "white" }),
  };
}

/**
 * Membuat konten popup HTML yang menyertakan tombol dinamis.
 */
function createPopupContent(loc, isFavorite) {
  const safeName = loc.name.replace(/'/g, "\\'");
  const safeDesc = (loc.desc || "").replace(/'/g, "\\'");

  let popupContent = `
    <div class="p-1 max-w-xs">
      <h4 class="font-bold text-lg text-blue-700">${loc.name}</h4>
      <p class="text-sm text-gray-600 mb-3">${loc.desc}</p>`;

  if (loc.img) {
    popupContent += `<img 
        src="${loc.img}" 
        alt="${loc.name}" 
        style="max-width: 100%; height: auto; object-fit: cover;" 
        class="mt-2 rounded-lg shadow-md border border-gray-200"
      >`;
  }

  if (isFavorite) {
    popupContent += `
      <div class="mt-2 space-y-2">
        <button 
          onclick="window.openEditModal(${loc.coords[0]}, ${loc.coords[1]})"
          class="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition duration-200 flex items-center justify-center space-x-1.5"
        >
          <i class="fa-solid fa-pencil" style="font-size: 0.8rem;"></i>
          <span>Edit Lokasi</span>
        </button>
        <button 
          onclick="window.deleteLocation(${loc.coords[0]}, ${loc.coords[1]})"
          class="w-full bg-red-500 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-lg text-sm transition duration-200 flex items-center justify-center space-x-1.5"
        >
          <i class="fa-solid fa-trash" style="font-size: 0.8rem;"></i>
          <span>Hapus Favorit</span>
        </button>
      </div>`;
  } else {
    popupContent += `
      <button 
        onclick="window.openFavoriteModal(${loc.coords[0]}, ${loc.coords[1]}, '${safeName}', '${safeDesc}')"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg text-sm transition duration-200 mt-2 flex items-center justify-center space-x-1.5"
      >
        <i class="fa-solid fa-star" style="font-size: 0.8rem;"></i>
        <span>Simpan ke Favorit</span>
      </button>`;
  }

  popupContent += `</div>`;
  return popupContent;
}

/**
 * Menambahkan marker ke peta, kini menerima argumen 'isFavorite'.
 */
function addMarkerToMap(mapInstance, loc, isFavorite) {
  const popupContent = createPopupContent(loc, isFavorite);

  const categoryKey = loc.category;
  const isCustomIconsReady = Object.keys(customIcons).length > 0;
  let markerOptions = {};

  if (isCustomIconsReady && categoryKey && customIcons[categoryKey]) {
    markerOptions.icon = customIcons[categoryKey];
  } else if (isCustomIconsReady && customIcons.default) {
    markerOptions.icon = customIcons.default;
  }

  L.marker(loc.coords, markerOptions).addTo(mapInstance).bindPopup(popupContent, { minWidth: 200 });
}


/**
 * Memproses, menyimpan lokasi baru, dan mengelola tampilan UI.
 */
function processNewLocation(dependencies, newLocation) {
  const { map, userLocations, modal, form, tempMarker, saveUserLocations } = dependencies;

  addMarkerToMap(map, newLocation, true);

  userLocations.push(newLocation);

  saveUserLocations(userLocations);

  if (tempMarker) {
    map.removeLayer(tempMarker);
  }

  modal.classList.add("hidden");
  form.reset();

  return userLocations;
}
