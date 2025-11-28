// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const locationRoutes = require('./routes/locationRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use('/api/locations', locationRoutes);
app.use(express.static(path.join(__dirname, '../public')));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;