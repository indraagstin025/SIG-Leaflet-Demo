// src/controllers/locationController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Lokasi
exports.getAllLocations = async (req, res) => {
  try {
    // Pastikan di schema.prisma modelnya bernama "Location"
    // Prisma client akan mengubahnya jadi lowercase: prisma.location
    const locations = await prisma.location.findMany();
    
    const formattedLocations = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      coords: [loc.latitude, loc.longitude],
      desc: loc.desc,
      category: loc.category,
      img: loc.img,
      isDefault: loc.isDefault
    }));

    res.json(formattedLocations);
  } catch (error) {
    console.error("Error di getAllLocations:", error); // Log error biar jelas
    res.status(500).json({ error: 'Gagal mengambil data database' });
  }
};

// 2. Simpan Lokasi Baru
exports.createLocation = async (req, res) => {
  // PERBAIKAN: Menambahkan 'desc' di sini agar tidak ReferenceError
  const { name, coords, desc, img, category } = req.body;

  try {
    const newLocation = await prisma.location.create({
      data: {
        name,
        latitude: parseFloat(coords[0]),
        longitude: parseFloat(coords[1]),
        desc: desc || "", // Beri string kosong jika desc tidak diisi
        img,
        category: category || 'user_custom',
        isDefault: false
      }
    });
    res.json(newLocation);
  } catch (error) {
    console.error("Error di createLocation:", error);
    res.status(500).json({ error: 'Gagal menyimpan lokasi' });
  }
};

// 3. Update Lokasi
exports.updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, desc, img } = req.body;

  try {
    const updated = await prisma.location.update({
      where: { id: parseInt(id) },
      data: { name, desc, img }
    });
    res.json(updated);
  } catch (error) {
    console.error("Error di updateLocation:", error);
    res.status(500).json({ error: 'Gagal update lokasi' });
  }
};

// 4. Hapus Lokasi
exports.deleteLocation = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.location.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Berhasil dihapus' });
  } catch (error) {
    console.error("Error di deleteLocation:", error);
    res.status(500).json({ error: 'Gagal menghapus' });
  }
};