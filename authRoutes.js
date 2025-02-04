require('dotenv').config();
const express = require('express');
const router = express.Router();
const db = require('./db'); // Collegamento al database
const { sendBookingConfirmationEmail } = require('./mailer'); // Importiamo le funzioni di invio email da mailer.js

// Rotta per creare una prenotazione e inviare l'email di conferma
router.post('/prenotazione', async (req, res) => {
    const { id_casa, nome_utente, email_utente, data_inizio, data_fine } = req.body;

    // Validazione dei dati della prenotazione
    if (!id_casa || !nome_utente || !email_utente || !data_inizio || !data_fine) {
        return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
    }

    // Inserimento nel database della prenotazione
    const query = 'INSERT INTO prenotazioni (id_casa, nome_utente, email_utente, data_inizio, data_fine) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [id_casa, nome_utente, email_utente, data_inizio, data_fine], async (err, result) => {
        if (err) {
            console.error('Errore durante l\'inserimento della prenotazione:', err);
            return res.status(500).json({ error: 'Errore del server durante l\'inserimento della prenotazione.' });
        }

        // Invia email di conferma prenotazione tramite `mailer.js`
        try {
            await sendBookingConfirmationEmail(email_utente, { nome: nome_utente, dataInizio: data_inizio, dataFine: data_fine });
            res.status(201).json({ message: `Prenotazione creata con successo! ID: ${result.insertId}` });
        } catch (error) {
            console.error('Errore durante l\'invio dell\'email di conferma prenotazione:', error);
            res.status(500).json({ message: 'Prenotazione avvenuta, ma si è verificato un errore durante l\'invio dell\'email di conferma.' });
        }
    });
});

module.exports = router;
