const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server Terhubung di: http://localhost:${PORT}`);
    console.log(` Terhubung ke Database Via Laragon`);
});