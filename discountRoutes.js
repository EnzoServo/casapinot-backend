// discountRoutes.js
const express = require('express');
const db = require('./db');  // Importa la connessione al database
const router = express.Router();

// Rotta per creare un codice sconto
router.post('/crea', (req, res) => {
    const { codice, scontoPercentuale, dataScadenza } = req.body;

    // Validazione dei dati in ingresso
    if (!codice || !scontoPercentuale || !dataScadenza) {
        return res.status(400).send('Errore: Tutti i campi sono obbligatori (codice, scontoPercentuale, dataScadenza).');
    }

    // Query per inserire il codice sconto nel database
    const query = 'INSERT INTO codici_sconto (codice, sconto_percentuale, data_scadenza) VALUES (?, ?, ?)';
    db.query(query, [codice, scontoPercentuale, dataScadenza], (err, result) => {
        if (err) {
            console.error('Errore durante la creazione del codice sconto:', err);
            return res.status(500).send('Errore del server durante la creazione del codice sconto.');
        }

        res.send('Codice sconto creato con successo!');
    });
});

// Rotta per ottenere tutti i codici sconto
router.get('/', (req, res) => {
    const query = 'SELECT * FROM codici_sconto';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Errore durante il recupero dei codici sconto:', err);
            return res.status(500).send('Errore del server durante il recupero dei codici sconto.');
        }

        res.json(results);
    });
});

// Rotta per ottenere un codice sconto specifico tramite il codice
router.get('/:codice', (req, res) => {
    const { codice } = req.params;

    console.log(`Richiesta per il codice sconto: ${codice}`); // Aggiunta per verificare il codice richiesto

    const query = 'SELECT * FROM codici_sconto WHERE codice = ?';
    db.query(query, [codice], (err, results) => {
        if (err) {
            console.error('Errore durante il recupero del codice sconto:', err);
            return res.status(500).send('Errore del server durante il recupero del codice sconto.');
        }

        if (results.length === 0) {
            return res.status(404).send('Errore: Codice sconto non trovato.');
        }

        res.json(results[0]);
    });
});

// Rotta per aggiornare un codice sconto esistente
router.put('/:codice', (req, res) => {
    const { codice } = req.params;
    const { scontoPercentuale, dataScadenza } = req.body;

    // Validazione dei dati di aggiornamento
    if (!scontoPercentuale || !dataScadenza) {
        return res.status(400).send('Errore: Tutti i campi sono obbligatori (scontoPercentuale, dataScadenza).');
    }

    // Query per aggiornare il codice sconto nel database
    const query = 'UPDATE codici_sconto SET sconto_percentuale = ?, data_scadenza = ? WHERE codice = ?';
    db.query(query, [scontoPercentuale, dataScadenza, codice], (err, result) => {
        if (err) {
            console.error('Errore durante l\'aggiornamento del codice sconto:', err);
            return res.status(500).send('Errore del server durante l\'aggiornamento del codice sconto.');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Errore: Codice sconto non trovato.');
        }

        res.send('Codice sconto aggiornato con successo!');
    });
});

// Rotta per eliminare un codice sconto
router.delete('/:codice', (req, res) => {
    const { codice } = req.params;

    // Query per eliminare il codice sconto dal database
    const query = 'DELETE FROM codici_sconto WHERE codice = ?';
    db.query(query, [codice], (err, result) => {
        if (err) {
            console.error('Errore durante l\'eliminazione del codice sconto:', err);
            return res.status(500).send('Errore del server durante l\'eliminazione del codice sconto.');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Errore: Codice sconto non trovato.');
        }

        res.send('Codice sconto eliminato con successo!');
    });
});

module.exports = router;
