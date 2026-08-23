const { Client, GatewayIntentBits, Partials, ActivityType, MessageFlags } = require('discord.js');
const express = require('express');
require('dotenv').config();

// 1. DÉMARRAGE IMMÉDIAT DU SERVEUR WEB (Pour Render)
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('⚙️ Le système de gestion HeLoRiA est pleinement opérationnel.');
});

app.listen(PORT, () => {
    console.log(`🌐 [Serveur Web] Écoute active sur le port ${PORT}`);
});

// 2. CONFIGURATION DU CLIENT DISCORD
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Message, 
        Partials.Channel, 
        Partials.GuildMember
    ]
});

// Liste des 5 modules
const modules = [
    { name: 'AutoMode', path: './modules/autoMode' },
    { name: 'RoleManager', path: './modules/roleManager' },
    { name: 'TicketSystem', path: './modules/ticketSystem' },
    { name: 'VoiceManager', path: './modules/voiceManager' },
    { name: 'WelcomeManager', path: './modules/welcomeManager' }
];

// Utilisation de 'clientReady' pour éviter le deprecation warning
client.once('clientReady', async (c) => {
    console.log(`\n==========================================`);
    console.log(`✅ [HELORIA GESTION] Connecté sous : ${c.user.tag}`);
    console.log(`==========================================\n`);

    // Application du statut
    try {
        client.user.setPresence({
            status: 'online',
            activities: [{
                name: '⚙️ Gestion & Support | Team HeLoRiA',
                type: ActivityType.Playing
            }]
        });
    } catch (err) {
        console.error("⚠️ Erreur Présence :", err.message);
    }

    // Chargement sécurisé des 5 modules
    for (const mod of modules) {
        try {
            const initFn = require(mod.path);
            if (typeof initFn === 'function') {
                await initFn(client);
                console.log(`✅ Module chargé : ${mod.name}`);
            } else {
                console.log(`⚠️ Module ${mod.name} ne renvoie pas une fonction.`);
            }
        } catch (err) {
            console.error(`❌ Erreur lors du chargement de ${mod.name} :`, err.message);
        }
    }
});

// Anti-crash global
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ [Anti-Crash] Rejet non géré :', reason);
});

process.on('uncaughtException', (err) => {
    console.error('⚠️ [Anti-Crash] Exception non capturée :', err);
});

// Connexion Discord
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ ERREUR FATALE : Variable DISCORD_TOKEN introuvable sur Render !");
} else {
    console.log("🔑 Token détecté. Connexion à Discord en cours...");
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error("❌ ÉCHEC CONNEXION DISCORD :", err.message);
    });
}
