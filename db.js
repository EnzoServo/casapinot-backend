// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'LosAngeles2022!',
    database: 'case_vacanze'
});

db.connect(err => {
    if (err) {
        console.error('Errore di connessione al database:', err);
        process.exit();
    }
    console.log('Connesso al database MySQL!');
});

module.exports = db;
