const express = require('express');
const db = require('./db'); // Importa il modulo per la connessione al database
const { Configuration, OpenAIApi } = require('openai'); // Libreria per integrare OpenAI

// Configurazione di OpenAI
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY, // Sostituire con la variabile d'ambiente che contiene la tua API Key di OpenAI
});
const openai = new OpenAIApi(configuration);

const router = express.Router();

// Rotta per inviare e ricevere messaggi di chat
router.post('/', async (req, res) => {
    const { user_id, message } = req.body;

    // Validazione del messaggio
    if (!message || typeof message !== 'string') {
        return res.status(400).send('Errore: Messaggio non valido.');
    }

    try {
        // Salviamo il messaggio dell'utente nel database
        const userMessageQuery = 'INSERT INTO chat (user_id, message, sender) VALUES (?, ?, ?)';
        db.query(userMessageQuery, [user_id, message, 'user'], async (err) => {
            if (err) {
                console.error('Errore durante l\'inserimento del messaggio dell\'utente:', err);
                return res.status(500).send('Errore del server.');
            }

            // Genera una risposta dal bot utilizzando l'API di OpenAI
            const response = await openai.createCompletion({
                model: 'text-davinci-003',
                prompt: message,
                max_tokens: 150,
            });

            const botMessage = response.data.choices[0].text.trim();

            // Salva il messaggio del bot nel database
            const botMessageQuery = 'INSERT INTO chat (user_id, message, sender) VALUES (?, ?, ?)';
            db.query(botMessageQuery, [user_id, botMessage, 'bot'], (err) => {
                if (err) {
                    console.error('Errore durante l\'inserimento del messaggio del bot:', err);
                    return res.status(500).send('Errore del server.');
                }

                // Rispondi con il messaggio del bot
                res.json({ message: botMessage });
            });
        });
    } catch (error) {
        console.error('Errore durante la risposta del bot:', error);
        res.status(500).send('Errore del server nel chatbot.');
    }
});

module.exports = router;
