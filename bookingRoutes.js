const express = require('express');
const db = require('./db'); // Connessione al database
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Integrazione Stripe
const { sendBookingConfirmationEmail } = require('./mailer'); // Importa la funzione per inviare l'email di conferma
const { sendNewsletterWelcomeEmail } = require('./mailer'); // Importa la funzione per l'email di benvenuto


const router = express.Router();

// Funzione per convertire la data dal formato italiano (gg/mm/aaaa) al formato YYYY-MM-DD
// Forzando l'incremento di un giorno per checkIn
function formatDateItalianToDBFormat(date, isCheckIn = false) {
    if (!date || date.length !== 10) return null; // Verifica che la data sia lunga 10 caratteri (gg/mm/aaaa)
    const [day, month, year] = date.split('/'); // Usa split per separare il giorno, mese e anno

    // Usa la data come una stringa senza manipolare i fusi orari
    const formattedDate = new Date(Date.UTC(year, month - 1, day)); // Usa UTC per evitare modifiche di fuso orario

    // Restituisce la data nel formato YYYY-MM-DD
    return formattedDate.toISOString().split('T')[0];
}

// Funzione per formattare la data nel formato MySQL (YYYY-MM-DD)
function formatDateDB(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
}

// Rotta per ottenere tutte le date occupate
router.get('/get-occupied-dates', (req, res) => {
    const query = `
        SELECT checkin, checkout FROM clienti_prenotazioni
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Errore durante il recupero delle date occupate:', err);
            return res.status(500).send('Errore durante il recupero delle date occupate.');
        }

        const occupiedDates = [];

        results.forEach(({ checkin, checkout }) => {
            const startDate = new Date(checkin);
            const endDate = new Date(checkout);

            // Aggiungi tutte le date tra check-in e (checkout - 1 giorno)
            // Escludiamo la data di checkout
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                occupiedDates.push(formatDateDB(new Date(d)));
            }
        });

        res.json(occupiedDates); // Restituisce l'elenco delle date occupate nel formato MySQL (YYYY-MM-DD)
    });
});



// Rotta per creare un'intenzione di pagamento con Stripe
router.post('/create-payment-intent', async (req, res) => {
    const { amount } = req.body; // L'importo deve essere in centesimi, ad esempio 1000 per 10€

    try {
        // Crea un PaymentIntent con l'importo specificato
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Importo in centesimi (ad esempio 1000 per 10 EUR)
            currency: 'eur',
            payment_method_types: ['card'], // Tipo di pagamento
        });

        // Restituisce il client secret per completare il pagamento
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('Errore durante la creazione dell\'intenzione di pagamento:', error);
        res.status(500).send('Errore durante la creazione dell\'intenzione di pagamento.');
    }
});

// Rimuovi questa funzione
// function formatDateItalianToDBFormat(date, isCheckIn = false) { ... }
// function formatDateDB(date) { ... }

// Rotta per confermare una prenotazione e salvarla in MySQL
router.post('/confirm-booking', async (req, res) => {
    const {
        checkIn,
        checkOut,
        adults,
        children,
        days,
        totalPrice,
        nome,
        cognome,
        email,
        telefono,
        indirizzo,
        citta,
        provincia,
        cap,
        payment_id,
        stato_pagamento,
    } = req.body;

    // Log dei dati ricevuti per il debug
    console.log("Dati ricevuti per la prenotazione:", req.body);

    // Controllo dei campi obbligatori
    if (
        !nome || !cognome || !email || !checkIn || !checkOut ||
        adults == null || children == null || days == null || totalPrice == null
    ) {
        return res.status(400).send('Errore: Tutti i campi obbligatori devono essere compilati.');
    }

    try {
        // Assicurati che totalPrice sia numerico
        const parsedTotalPrice = parseFloat(totalPrice);

        if (isNaN(parsedTotalPrice)) {
            return res.status(400).send('Errore: il valore di totalPrice deve essere numerico.');
        }

        // Le date arrivano già nel formato giusto, quindi non c'è bisogno di formattarle
        const formattedCheckinDate = checkIn; // Supponiamo che checkIn sia già nel formato YYYY-MM-DD
        const formattedCheckoutDate = checkOut; // Supponiamo che checkOut sia già nel formato YYYY-MM-DD

        // Log delle date formattate
        console.log("Data check-in:", formattedCheckinDate);
        console.log("Data check-out:", formattedCheckoutDate);

        // Query per inserire la prenotazione nel database
        const query = `
        INSERT INTO clienti_prenotazioni (
            checkin, checkout, numero_adulti, numero_bambini, totale_giorni,
            costo_soggiorno, nome, cognome, email, telefono, indirizzo, citta, provincia, cap, payment_id, stato_pagamento
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            formattedCheckinDate,  // checkin
            formattedCheckoutDate, // checkout
            adults,                // numero_adulti
            children,              // numero_bambini
            days,                  // totale_giorni
            parsedTotalPrice,      // costo_soggiorno
            nome,                  // nome
            cognome,               // cognome
            email,                 // email
            telefono,              // telefono
            indirizzo,             // indirizzo
            citta,                 // citta
            provincia,             // provincia
            cap,                   // cap
            payment_id,            // payment_id
            stato_pagamento        // stato_pagamento
        ];

        // Log dei valori che verranno inseriti
        console.log("Valori per l'inserimento:", values);

        // Esegui la query nel database
        db.query(query, values, async (err, result) => {
            if (err) {
                console.error('Errore durante l\'inserimento della prenotazione:', err.message);
                return res.status(500).send('Errore durante l\'inserimento della prenotazione.');
            }

            if (result.affectedRows === 0) {
                console.error('Nessuna prenotazione inserita.');
                return res.status(500).send('Errore durante l\'inserimento della prenotazione.');
            }

            // Log della risposta della query
            console.log("Prenotazione inserita con successo, ID:", result.insertId);

            // Invia la conferma della prenotazione via email
            const bookingDetails = {
                nome,
                dataInizio: formattedCheckinDate,
                dataFine: formattedCheckoutDate,
            };
            await sendBookingConfirmationEmail(email, bookingDetails);

            // Risposta positiva dopo l'inserimento e l'invio dell'email
            res.status(201).json({
                message: 'Prenotazione confermata con successo! Email inviata.',
                id: result.insertId,  // ID della prenotazione appena creata
            });
        });
        
    } catch (error) {
        console.error('Errore interno del server:', error);
        res.status(500).send('Errore interno del server.');
    }
});


// Rotta per ottenere tutte le prenotazioni
router.get('/get-bookings', async (req, res) => {
    const query = `
        SELECT checkin, checkout, numero_adulti, numero_bambini, costo_soggiorno, nome, cognome, email, telefono, indirizzo, citta, provincia, cap
        FROM clienti_prenotazioni
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Errore durante il recupero delle prenotazioni:', err);
            return res.status(500).send('Errore durante il recupero delle prenotazioni.');
        }

        res.json(results); // Restituisce tutte le prenotazioni
    });
});

// Rotta per ottenere tutte le date occupate
router.get('/get-occupied-dates', (req, res) => {
    const query = `
        SELECT checkin, checkout FROM clienti_prenotazioni
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Errore durante il recupero delle date occupate:', err);
            return res.status(500).send('Errore durante il recupero delle date occupate.');
        }

        const occupiedDates = [];

        results.forEach(({ checkin, checkout }) => {
            const startDate = new Date(checkin);
            const endDate = new Date(checkout);

            // Aggiungi tutte le date tra check-in e (checkout - 1 giorno)
            // Escludiamo la data di checkout
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                occupiedDates.push(formatDateDBToItalianFormat(new Date(d).toISOString().split('T')[0]));
            }
        });

        res.json(occupiedDates); // Restituisce l'elenco delle date occupate nel formato italiano
    });
});

// Rotta per ottenere una prenotazione specifica tramite ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT * FROM clienti_prenotazioni WHERE id = ?
    `;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Errore durante il recupero della prenotazione:', err);
            return res.status(500).send('Errore durante il recupero della prenotazione.');
        }

        if (results.length === 0) {
            return res.status(404).send('Prenotazione non trovata.');
        }

        res.json(results[0]); // Restituisce i dettagli della prenotazione
    });
});

// Rotta per iscriversi alla newsletter
router.post('/newsletter/subscribe', (req, res) => {
    const { email } = req.body; // Email del nuovo iscritto

    // Verifica che l'email sia fornita
    if (!email) {
        return res.status(400).send('Errore: L\'email è obbligatoria');
    }

    // Query SQL per inserire l'email nella tabella `newsletter_subscribers`
    const query = `
        INSERT INTO newsletter_subscribers (email) 
        VALUES (?)
    `;

    // Esegui la query
    db.query(query, [email], async (err, result) => {
        if (err) {
            console.error('Errore durante l\'iscrizione alla newsletter:', err);
            return res.status(500).send('Errore durante l\'iscrizione alla newsletter');
        }

        // Invio l'email di benvenuto alla newsletter
        try {
            // Passa l'email e un nome di default (per esempio "Utente") per la personalizzazione
            await sendNewsletterWelcomeEmail(email, 'Utente');
        } catch (error) {
            console.error("Errore durante l'invio dell'email di benvenuto:", error);
            // Anche se l'invio dell'email fallisce, rispondi comunque con successo per la parte di iscrizione
        }

        res.status(201).json({
            message: 'Iscrizione alla newsletter avvenuta con successo.',
        });
    });
});


module.exports = router;
