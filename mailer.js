require('dotenv').config();
const SibApiV3Sdk = require('@sendinblue/client');

// Configurazione del client Sendinblue (Brevo)
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.SENDINBLUE_API_KEY);

// Funzione per inviare la conferma di prenotazione
async function sendBookingConfirmationEmail(userEmail, bookingDetails) {
    const sendSmtpEmail = {
        to: [{ email: userEmail }],
        sender: { email: process.env.SENDER_EMAIL, name: 'Casa Pinòt' },
        templateId: 2, // Template per la conferma della prenotazione (ID esempio)
        params: {
            nome: bookingDetails.nome,
            dataInizio: bookingDetails.dataInizio,
            dataFine: bookingDetails.dataFine
        }
    };

    try {
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Email di conferma prenotazione inviata a ${userEmail}:`, response);
    } catch (error) {
        console.error("Errore durante l'invio dell'email di conferma prenotazione:", error);
    }
}

// Funzione per inviare l'email di benvenuto alla newsletter
async function sendNewsletterWelcomeEmail(userEmail, userName) {
    const sendSmtpEmail = {
        to: [{ email: userEmail }],
        sender: { email: process.env.SENDER_EMAIL, name: 'Casa Pinòt' },
        templateId: 8,  // ID esempio per il template di benvenuto alla newsletter
        params: {
            nome: userName,  // Parametro per personalizzare il nome dell'utente
        }
    };

    try {
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Email di benvenuto alla newsletter inviata a ${userEmail}:`, response);
    } catch (error) {
        console.error("Errore durante l'invio dell'email di benvenuto alla newsletter:", error);
    }
}

// Funzione per inviare l'email di contatto
async function sendContactEmail(name, email, subject, message) {
    const sendSmtpEmail = {
        to: [{ email: 'info@casapinot.com' }],
        sender: { email: 'no-reply@casapinot.com', name: 'Casa Pinòt' },
        subject: subject,
        textContent: `Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${message}`
    };

    try {
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email inviata con successo:', response);
    } catch (error) {
        console.error('Errore durante l\'invio dell\'email di contatto:', error);
    }
}

// Esporta le funzioni per essere utilizzate altrove nel progetto
module.exports = {
    sendBookingConfirmationEmail,
    sendNewsletterWelcomeEmail,
    sendContactEmail // Aggiungi questa riga per esportare la funzione di contatto
};