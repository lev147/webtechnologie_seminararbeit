const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const path = require('path');
const session = require('express-session');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'dein_geheimer_schlüssel', // Ändere dies in einen zufälligen Schlüssel
  resave: false,
  saveUninitialized: true
}));

// Route für die Haupt-URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route für Registrierungsseite
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

// Route für Loginseite
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Route für Formularseite
app.get('/form', (req, res) => {
  if (req.session.username) {
    res.sendFile(path.join(__dirname, 'form.html'));
  } else {
    res.redirect('/login');
  }
});

// Route für Geschenke-Seite
app.get('/gifts', (req, res) => {
  if (req.session.username) {
    res.sendFile(path.join(__dirname, 'gifts.html'));
  } else {
    res.redirect('/login');
  }
});

// SQLite Datenbank initialisieren
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Fehler beim Öffnen der Datenbank:', err.message);
  } else {
    console.log('Verbunden mit der SQLite-Datenbank.');
  }
});
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (username TEXT, email TEXT, age INTEGER, birthdate TEXT, password TEXT, gender TEXT, subscribe INTEGER)", (err) => {
    if (err) {
      console.error('Fehler beim Erstellen der Tabelle:', err.message);
    } else {
      console.log('Tabelle "users" erfolgreich erstellt oder existiert bereits.');
    }
  });
  db.run("CREATE TABLE IF NOT EXISTS gifts (username TEXT, gift TEXT)", (err) => {
    if (err) {
      console.error('Fehler beim Erstellen der Tabelle:', err.message);
    } else {
      console.log('Tabelle "gifts" erfolgreich erstellt oder existiert bereits.');
    }
  });
});

// Nodemailer Transporter einrichten
const transporter = nodemailer.createTransport({
  host: 'mail.gmx.net',
  port: 587,
  secure: false,
  auth: {
    user: 'TestautomatisierungFOM@gmx.de',
    pass: 'TestautomatisierungFOM123'
  }
});

// Registrierungshandling
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Überprüfen, ob der Benutzername bereits existiert
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) {
      console.error('Fehler bei der Registrierung:', err.message);
      res.status(500).send('Fehler bei der Registrierung.');
      return;
    }
    if (row) {
      // Benutzername existiert bereits
      res.send(`
        <html>
        <head>
          <title>Registrierung fehlgeschlagen</title>
          <link rel="stylesheet" href="css/styles.css">
        </head>
        <body>
          <h1>Registrierung fehlgeschlagen</h1>
          <p>Der Benutzername ist bereits vergeben. Bitte wähle einen anderen Benutzernamen oder melde dich an, wenn du bereits ein Konto hast.</p>
          <button onclick="window.location.href='/register'">Zurück zur Registrierung</button>
          <button onclick="window.location.href='/login'">Zum Login</button>
        </body>
        </html>
      `);
    } else {
      // Benutzername ist verfügbar, Registrierungsdaten in die Datenbank einfügen
      const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
      stmt.run(username, password, (err) => {
        if (err) {
          console.error('Fehler bei der Registrierung:', err.message);
          res.status(500).send('Fehler bei der Registrierung.');
          return;
        }
        console.log('Benutzer erfolgreich registriert.');
        res.redirect('/login');
      });
      stmt.finalize();
    }
  });
});

// Loginhandling
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (err) {
      console.error('Fehler beim Login:', err.message);
      res.status(500).send('Fehler beim Login.');
      return;
    }
    if (row) {
      console.log('Benutzer erfolgreich eingeloggt.');
      req.session.username = username; // Benutzername in der Session speichern
      res.redirect('/form'); // Nach erfolgreichem Login zur Formularseite weiterleiten
    } else {
      // Fehlgeschlagener Login: Zeige eine Seite mit Fehlermeldung und Rückkehrbutton an
      res.send(`
        <html>
        <head>
          <title>Login fehlgeschlagen</title>
          <link rel="stylesheet" href="css/styles.css">
        </head>
        <body>
          <h1>Login fehlgeschlagen</h1>
          <p>Die Anmeldedaten sind ungültig. Bitte versuche es erneut.</p>
          <button onclick="window.location.href='/login'">Zurück zum Login</button>
        </body>
        </html>
      `);
    }
  });
});

// Route für Formularabsendung
app.post('/submit', (req, res) => {
  const { email, age, birthdate, password, gender, subscribe } = req.body;
  const username = req.session.username; // Benutzername aus der Session holen

  const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)");
  stmt.run(username, email, age, birthdate, password, gender, subscribe ? 1 : 0, (err) => {
    if (err) {
      console.error('Fehler beim Einfügen der Daten:', err.message);
      res.status(500).send('Fehler beim Speichern der Daten.');
      return;
    }
    console.log('Daten erfolgreich eingefügt.');

    // E-Mail-Inhalt
    const mailOptions = {
      from: 'TestautomatisierungFOM@gmx.de', // <--- HIER NOCHMALS DEINE E-MAIL-ADRESSE ALS ABSENDER
      to: email, // <--- DIE VOM NUTZER HINTERLEGTE E-MAIL-ADRESSE
      subject: 'Formularbestätigung',
      text: `Hallo ${username},\n\nVielen Dank für das Ausfüllen des Formulars.\n\n${subscribe ? 'Du hast dich erfolgreich für den Newsletter angemeldet.' : 'Du hast den Newsletter nicht abonniert.'}\n\nBeste Grüße,\nDein Team`
    };

    // E-Mail senden
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.status(500).send('Fehler beim Senden der E-Mail.');
        return;
      }
      console.log('E-Mail gesendet: ' + info.response);
      res.send('Formular erfolgreich abgeschickt und Daten gespeichert.');
    });
  });
  stmt.finalize();
});

// Geschenk-Auswahlhandling
app.post('/select-gift', (req, res) => {
  const username = req.session.username; // Benutzername aus der Session holen
  const { gift } = req.body;

  // Überprüfen, ob bereits ein Geschenk für den Benutzer vorhanden ist
  db.get("SELECT * FROM gifts WHERE username = ?", [username], (err, row) => {
    if (err) {
      console.error('Fehler bei der Geschenküberprüfung:', err.message);
      res.status(500).send('Fehler bei der Auswahl des Geschenks.');
      return;
    }

    if (row) {
      // Geschenk existiert bereits, daher aktualisieren wir es
      const stmt = db.prepare("UPDATE gifts SET gift = ? WHERE username = ?");
      stmt.run(gift, username, (err) => {
        if (err) {
          console.error('Fehler beim Aktualisieren des Geschenks:', err.message);
          res.status(500).send('Fehler bei der Auswahl des Geschenks.');
          return;
        }
        console.log('Geschenk erfolgreich aktualisiert.');
        res.redirect('/gift-success');
      });
      stmt.finalize();
    } else {
      // Kein Geschenk vorhanden, daher fügen wir ein neues hinzu
      const stmt = db.prepare("INSERT INTO gifts (username, gift) VALUES (?, ?)");
      stmt.run(username, gift, (err) => {
        if (err) {
          console.error('Fehler bei der Auswahl des Geschenks:', err.message);
          res.status(500).send('Fehler bei der Auswahl des Geschenks.');
          return;
        }
        console.log('Geschenk erfolgreich ausgewählt.');
        res.redirect('/gift-success');
      });
      stmt.finalize();
    }
  });
});


// Route für die Erfolgsmeldungs-Seite
app.get('/gift-success', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Geschenk erfolgreich ausgewählt</title>
      <link rel="stylesheet" href="css/styles.css">
    </head>
    <body>
      <h1>Geschenk erfolgreich ausgewählt</h1>
      <p>Vielen Dank, dass Sie Ihr Geschenk ausgewählt haben.</p>
      <button onclick="window.location.href='/'">Zur Startseite</button>
      <button onclick="window.location.href='/form'">Zur Formularseite</button>
    </body>
    </html>
  `);
});

// Server starten
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
