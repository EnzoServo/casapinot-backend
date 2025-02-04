const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'roundhouse.proxy.rlwy.net', // Host di Railway
    port: 16046, // Porta di Railway
    user: 'root', // Utente MySQL su Railway
    password: 'TiAtatKHOLJsjQuDCBsvvgxcoJiMrqiS', // Password MySQL su Railway
    database: 'railway' // Nome del database su Railway
});

db.connect(err => {
    if (err) {
        console.error('❌ Errore di connessione al database:', err);
        process.exit();
    }
    console.log('✅ Connesso al database MySQL su Railway!');
});

module.exports = db;
