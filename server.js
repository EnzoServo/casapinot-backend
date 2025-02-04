require('dotenv').config(); // Importiamo e configuriamo dotenv

const express = require('express');
const cors = require('cors'); // Importa CORS
const app = express();
const authRoutes = require('./authRoutes');        // Importa le rotte di autenticazione
const bookingRoutes = require('./bookingRoutes');  // Importa le rotte di prenotazione
const paymentRoutes = require('./paymentRoutes');  // Importa le rotte di pagamento
const discountRoutes = require('./discountRoutes'); // Importa le rotte di sconto
const { sendContactEmail } = require('./mailer');
const db = require('./db'); // Importa la connessione al database



// Middleware per leggere i dati JSON dal corpo delle richieste
app.use(express.json());

// Aggiungi il middleware CORS
app.use(cors());

app.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    // Controlla che tutti i campi siano presenti
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
    }

    try {
        // Invia l'email
        await sendContactEmail(name, email, subject, message);
        return res.status(200).json({ message: 'Email inviata con successo!' });
    } catch (error) {
        console.error('Errore durante l\'invio dell\'email di contatto:', error);
        return res.status(500).json({ error: 'Errore durante l\'invio dell\'email.' });
    }
});

// Utilizziamo un middleware per loggare tutte le richieste ricevute (facoltativo, ma utile per il debug)
app.use((req, res, next) => {
    console.log(`${req.method} request for '${req.url}'`);
    next();
});

// Rotte per autenticazione, prenotazioni, pagamenti e sconti
app.use('/auth', authRoutes);           // Prefisso per tutte le rotte di autenticazione (es. /auth/register)
app.use('/prenotazioni', bookingRoutes); // Prefisso per tutte le rotte di prenotazione (es. /prenotazioni/:id)
app.use('/pagamenti', paymentRoutes);    // Prefisso per tutte le rotte di pagamento (es. /pagamenti/create-payment-intent)
app.use('/sconto', discountRoutes);      // Prefisso per tutte le rotte di sconto (es. /sconto/crea)

// Definiamo una rotta di test per verificare che il server sia in esecuzione correttamente
app.get('/', (req, res) => {
    res.send('Server attivo e funzionante!');
});

app.post('/prenotazione', (req, res) => {
    console.log("Dati ricevuti:", req.body);
    res.send("Dati ricevuti con successo");
});

// Definiamo la porta su cui il server ascolterà le richieste
const PORT = process.env.PORT || 5000;

// Avviamo il server sulla porta specificata
app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
