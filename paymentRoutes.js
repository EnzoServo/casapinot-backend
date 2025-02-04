require('dotenv').config(); // Per leggere la chiave API di Stripe dal file .env
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Utilizza la chiave API dal file .env
const db = require('./db');  // Importiamo la connessione al database
const { sendPaymentConfirmationEmail, sendBookingConfirmationEmail } = require('./mailer'); // Importa le funzioni per inviare l'email

// Rotta per creare una nuova intenzione di pagamento
router.post('/create-payment-intent', async (req, res) => {
    const { amount, currency, email_utente, bookingDetails } = req.body;

    // Validazione dei dati
    if (!amount || !currency || !email_utente || !bookingDetails) {
        return res.status(400).send('Errore: Importo, valuta, email utente e dettagli prenotazione sono obbligatori. Assicurati di fornire "amount", "currency", "email_utente" e "bookingDetails" nel corpo della richiesta.');
    }

    try {
        // Creiamo l'intenzione di pagamento con Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            payment_method_types: ['card'], // Ad esempio, pagamento con carta
        });

        // Restituiamo il client secret che sarà utilizzato nel frontend per completare il pagamento
        res.json({ clientSecret: paymentIntent.client_secret });

    } catch (error) {
        console.error('Errore durante la creazione dell\'intenzione di pagamento:', error);
        res.status(500).send('Errore durante la creazione del pagamento.');
    }
});

// Rotta per confermare il pagamento e creare la prenotazione
router.post('/confirm-payment', async (req, res) => {
    const { paymentIntentId, id_casa, nome_utente, email_utente, data_inizio, data_fine } = req.body;

    // Validazione
    if (!paymentIntentId || !id_casa || !nome_utente || !email_utente || !data_inizio || !data_fine) {
        return res.status(400).send('Errore: Tutti i campi sono obbligatori.');
    }

    try {
        // Recuperiamo l'intenzione di pagamento per verificarne lo stato
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            // Pagamento riuscito, confermiamo la prenotazione inserendola nel database
            const query = 'INSERT INTO prenotazioni (id_casa, nome_utente, email_utente, data_inizio, data_fine) VALUES (?, ?, ?, ?, ?)';
            db.query(query, [id_casa, nome_utente, email_utente, data_inizio, data_fine], async (err, result) => {
                if (err) {
                    console.error('Errore durante l\'inserimento della prenotazione:', err);
                    return res.status(500).send('Errore del server durante l\'inserimento della prenotazione.');
                }

                // Invia email di conferma pagamento e prenotazione tramite `mailer.js`
                try {
                    await sendPaymentConfirmationEmail(email_utente, { nome: nome_utente, dataInizio: data_inizio, dataFine: data_fine });
                    await sendBookingConfirmationEmail(email_utente, { nome: nome_utente, dataInizio: data_inizio, dataFine: data_fine });

                    console.log(`Email di conferma pagamento e prenotazione inviata a ${email_utente}`);
                    res.send(`Pagamento confermato e prenotazione creata con successo! ID Prenotazione: ${result.insertId}`);
                } catch (error) {
                    console.error('Errore durante l\'invio dell\'email di conferma pagamento e prenotazione:', error);
                    res.status(500).send('Prenotazione avvenuta, ma si è verificato un errore durante l\'invio dell\'email di conferma.');
                }
            });
        } else {
            res.status(400).send('Errore: Il pagamento non è stato completato con successo.');
        }
    } catch (error) {
        console.error('Errore durante il recupero dell\'intenzione di pagamento:', error);
        res.status(500).send('Errore durante la verifica del pagamento.');
    }
});

module.exports = router;
