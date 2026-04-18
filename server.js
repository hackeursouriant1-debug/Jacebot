const express = require('express');
const cors = require('cors');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const AUTH_DIR = './auth_sessions';
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const logger = pino({ level: 'silent' });
const msgRetryCounterCache = new NodeCache();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/pair', async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
        return res.json({ success: false, message: 'Numéro de téléphone manquant' });
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length < 8) {
        return res.json({ success: false, message: 'Numéro de téléphone invalide' });
    }
    
    try {
        console.log(`📱 Génération de code pour : ${cleanPhone}`);
        
        const sessionId = `pair_${Date.now()}_${cleanPhone}`;
        const authFolder = path.join(AUTH_DIR, sessionId);
        
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            msgRetryCounterCache,
            browser: ["JACE BOT", "Chrome", "2.0.0"]
        });
        
        await new Promise((resolve) => {
            sock.ev.on('connection.update', (update) => {
                if (update.connection === 'open') resolve();
            });
            setTimeout(resolve, 30000);
        });
        
        const code = await sock.requestPairingCode(cleanPhone);
        console.log(`✅ Code généré : ${code}`);
        
        await saveCreds();
        try { await sock.logout(); } catch (e) {}
        
        setTimeout(() => {
            try { fs.rmSync(authFolder, { recursive: true, force: true }); } catch (e) {}
        }, 300000);
        
        res.json({ 
            success: true, 
            code: code,
            formattedCode: code.slice(0, 4) + '-' + code.slice(4),
            expiresIn: 120
        });
        
    } catch (err) {
        console.error('❌ Erreur:', err.message);
        res.json({ success: false, message: 'Erreur: ' + err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur sur le port ${PORT}`));
