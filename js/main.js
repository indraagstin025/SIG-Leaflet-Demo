window.onload = function () {
  const DEFAULT_CENTER = [-6.917, 107.619];
  const DEFAULT_ZOOM = 13;

  let map;
  let userLocations;
  let hiddenLocations;
  let tempCoords = null;
  let tempMarker = null;
  let currentlyEditingCoords = null;

  const HIDDEN_LOCATIONS_KEY = "hiddenDefaultLocations";

  const modal = document.getElementById("location-modal");
  const form = document.getElementById("location-form");
  const cancelBtnModal = document.getElementById("cancel-btn-modal");
  const locNameInput = document.getElementById("loc-name");
  const locDescInput = document.getElementById("loc-desc");
  const locImgInput = document.getElementById("loc-img");

  function saveUserLocations(locationsArray) {
    localStorage.setItem("myFavoriteLocations", JSON.stringify(locationsArray));
  }

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

    L.Control.CustomButtons = L.Control.extend({
      onAdd: function (map) {
        const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        L.DomEvent.disableClickPropagation(container);

        const findMeButton = L.DomUtil.create("a", "leaflet-control-custom-button", container);
        findMeButton.href = "#";
        findMeButton.title = "Cari Lokasi Saya";
        findMeButton.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';

        L.DomEvent.on(findMeButton, "click", L.DomEvent.stop);
        L.DomEvent.on(findMeButton, "click", function () {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              function (position) {
                const userCoords = [position.coords.latitude, position.coords.longitude];
                map.setView(userCoords, 16);

                const myLocation = {
                  name: "Lokasi Saya Saat Ini",
                  desc: "Lokasi terdeteksi dari GPS.",
                  coords: userCoords,
                  category: "default",
                };

                const popupContent = createPopupContent(myLocation, false);

                let markerOptions = {};
                if (typeof customIcons !== "undefined" && customIcons.default) {
                  markerOptions.icon = customIcons.default;
                }

                L.marker(userCoords, markerOptions).addTo(map).bindPopup(popupContent, { minWidth: 200 }).openPopup();
              },
              function (error) {
                let errorMessage = "Error: Tidak bisa mendapatkan lokasi Anda. ";
                if (error.code === 1) errorMessage += "Anda telah menolak izin lokasi.";
                else if (error.code === 2) errorMessage += "Lokasi tidak tersedia.";
                else if (error.code === 3) errorMessage += "Waktu permintaan habis (timeout).";
                else errorMessage += error.message;
                alert(errorMessage);
              }
            );
          } else {
            alert("Fitur Geolocation tidak didukung oleh browser Anda.");
          }
        });

        const clearButton = L.DomUtil.create("a", "leaflet-control-custom-button", container);
        clearButton.href = "#";
        clearButton.title = "Hapus Semua Lokasi";
        clearButton.innerHTML = '<i class="fa-solid fa-trash"></i>';

        L.DomEvent.on(clearButton, "click", L.DomEvent.stop);
        L.DomEvent.on(clearButton, "click", function () {
          if (confirm("Apakah Anda yakin ingin MENGHAPUS SEMUA lokasi? (Ini akan membersihkan favorit DAN menyembunyikan lokasi default).")) {
            localStorage.removeItem("myFavoriteLocations");
            const allDefaultCoords = defaultLocations.map((loc) => loc.coords);
            localStorage.setItem(HIDDEN_LOCATIONS_KEY, JSON.stringify(allDefaultCoords));
            alert("Semua lokasi telah dihapus/disembunyikan.");
            location.reload();
          }
        });

        return container;
      },

      onRemove: function (map) {},
    });

    new L.Control.CustomButtons({ position: "topleft" }).addTo(map);
  }

  initializeMap();

  window.openFavoriteModal = function (lat, lng, name, desc) {
    map.closePopup();
    if (tempMarker) map.removeLayer(tempMarker);
    tempCoords = [lat, lng];
    form.reset();
    locNameInput.value = name;
    locDescInput.value = desc || "";
    document.querySelector("#location-modal h3").innerText = "Simpan Lokasi Favorit 📌";
    modal.classList.remove("hidden");
    locNameInput.focus();
  };

  window.openEditModal = function (lat, lng) {
    map.closePopup();
    const locationToEdit = userLocations.find((loc) => loc.coords[0] === lat && loc.coords[1] === lng);
    if (!locationToEdit) return;

    currentlyEditingCoords = locationToEdit.coords;
    form.reset();
    locNameInput.value = locationToEdit.name;
    locDescInput.value = locationToEdit.desc || "";
    document.querySelector("label[for='loc-img']").innerText = "Ganti Foto (Opsional):";
    document.querySelector("#location-modal h3").innerText = "Edit Lokasi Favorit ✏️";
    modal.classList.remove("hidden");
    locNameInput.focus();
  };

  window.deleteLocation = function (lat, lng) {
    map.closePopup();
    if (!confirm("Apakah Anda yakin ingin menghapus lokasi ini dari favorit?")) {
      return;
    }

    const indexToRemove = userLocations.findIndex((loc) => loc.coords[0] === lat && loc.coords[1] === lng);
    if (indexToRemove === -1) return;

    const locToRemove = userLocations[indexToRemove];

    const isDefault = defaultLocations.some((defLoc) => defLoc.coords[0] === locToRemove.coords[0] && defLoc.coords[1] === locToRemove.coords[1]);

    if (isDefault) {
      hiddenLocations.push(locToRemove.coords);
      localStorage.setItem(HIDDEN_LOCATIONS_KEY, JSON.stringify(hiddenLocations));
    }

    userLocations.splice(indexToRemove, 1);
    saveUserLocations(userLocations);

    alert("Lokasi favorit telah dihapus.");
    location.reload();
  };

  userLocations = JSON.parse(localStorage.getItem("myFavoriteLocations")) || [];
  hiddenLocations = JSON.parse(localStorage.getItem(HIDDEN_LOCATIONS_KEY)) || [];

  initializeIcons();

  const userLocationCoords = new Set(userLocations.map((loc) => loc.coords.join(",")));
  const hiddenLocationCoords = new Set(hiddenLocations.map((coords) => coords.join(",")));

  userLocations.forEach((loc) => addMarkerToMap(map, loc, true));

  defaultLocations.forEach((loc) => {
    const coordString = loc.coords.join(",");
    if (!userLocationCoords.has(coordString) && !hiddenLocationCoords.has(coordString)) {
      addMarkerToMap(map, loc, false);
    }
  });

  cancelBtnModal.addEventListener("click", function () {
    modal.classList.add("hidden");
    form.reset();
    if (tempMarker) map.removeLayer(tempMarker);
    currentlyEditingCoords = null;
    tempCoords = null;
    document.querySelector("label[for='loc-img']").innerText = "Foto (Opsional):";
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = locNameInput.value;
    const desc = locDescInput.value || "Lokasi baru.";
    const file = locImgInput.files[0];

    if (currentlyEditingCoords) {
      const indexToEdit = userLocations.findIndex((loc) => loc.coords[0] === currentlyEditingCoords[0] && loc.coords[1] === currentlyEditingCoords[1]);
      if (indexToEdit === -1) return;

      userLocations[indexToEdit].name = name;
      userLocations[indexToEdit].desc = desc;

      const handleSave = () => {
        saveUserLocations(userLocations);
        alert("Lokasi berhasil diperbarui.");
        location.reload();
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          userLocations[indexToEdit].img = event.target.result;
          handleSave();
        };
        reader.readAsDataURL(file);
      } else {
        handleSave();
      }
    } else {
      if (!tempCoords) return;

      const newLocationData = {
        name: name,
        coords: tempCoords,
        desc: desc,
      };

      const dependencies = {
        map: map,
        userLocations: userLocations,
        modal: modal,
        form: form,
        tempMarker: tempMarker,
        saveUserLocations: saveUserLocations,
      };

      const handleCreate = (data) => {
        const coordString = data.coords.join(",");
        const hiddenIndex = hiddenLocationCoords.has(coordString) ? hiddenLocations.findIndex((coords) => coords.join(",") === coordString) : -1;

        if (hiddenIndex > -1) {
          hiddenLocations.splice(hiddenIndex, 1);
          localStorage.setItem(HIDDEN_LOCATIONS_KEY, JSON.stringify(hiddenLocations));
        }
        userLocations = processNewLocation(dependencies, data);
        location.reload();
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          newLocationData.img = event.target.result;
          handleCreate(newLocationData);
        };
        reader.readAsDataURL(file);
      } else {
        handleCreate(newLocationData);
      }
    }
    currentlyEditingCoords = null;
    tempCoords = null;
  });

  var geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Cari lokasi atau alamat...",
  }).addTo(map);
  geocoder.on("markgeocode", function (e) {
    map.fitBounds(e.geocode.bbox);
  });

  map.on("click", function (e) {
    if (currentlyEditingCoords) return;
    map.closePopup();

    tempCoords = [e.latlng.lat, e.latlng.lng];
    if (tempMarker) map.removeLayer(tempMarker);

    const defaultIcon = customIcons && customIcons.default ? customIcons.default : new L.Icon.Default();
    tempMarker = L.marker(tempCoords, { icon: defaultIcon }).addTo(map);

    form.reset();
    locNameInput.value = "Lokasi Baru";
    document.querySelector("#location-modal h3").innerText = "Tambahkan Lokasi Baru 📌";
    modal.classList.remove("hidden");
    locNameInput.focus();
  });
};
