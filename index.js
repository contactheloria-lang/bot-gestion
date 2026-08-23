const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const express = require('express');
require('dotenv').config();

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

// Importation sécurisée des 5 modules
const modules = [
    { name: 'AutoMode', path: './modules/autoMode' },
    { name: 'RoleManager', path: './modules/roleManager' },
    { name: 'TicketSystem', path: './modules/ticketSystem' },
    { name: 'VoiceManager', path: './modules/voiceManager' },
    { name: 'WelcomeManager', path: './modules/welcomeManager' }
];

client.once('ready', async (c) => {
    console.log(`\n==========================================`);
    console.log(`✅ [HELORIA GESTION] Connecté sous : ${c.user.tag}`);
    console.log(`==========================================\n`);

    // 1. Passage du statut en ligne IMMÉDIATEMENT
    try {
        client.user.setPresence({
            status: 'online',
            activities: [{
                name: '⚙️ Gestion & Support | Team HeLoRiA',
                type: ActivityType.Playing
            }]
        });
    } catch (err) {
        console.error("⚠️ Erreur Presence :", err.message);
    }

    // 2. Chargement individuel des 5 modules
    for (const mod of modules) {
        try {
            const initFn = require(mod.path);
            if (typeof initFn === 'function') {
                await initFn(client);
                console.log(`✅ Module chargé : ${mod.name}`);
            } else {
                console.log(`⚠️ Module ${mod.name} ne renvoie pas une fonction d'initialisation.`);
            }
        } catch (err) {
            console.error(`❌ Erreur lors du chargement de ${mod.name} :`, err.message);
        }
    }
});

// Serveur Web Express pour Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('⚙️ Le système de gestion HeLoRiA est pleinement opérationnel.');
});

app.listen(PORT, () => {
    console.log(`🌐 [Serveur Web] Écoute active sur le port ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ [Anti-Crash] Rejet non géré :', reason);
});

process.on('uncaughtException', (err) => {
    console.error('⚠️ [Anti-Crash] Exception non capturée :', err);
});

// Connexion Discord avec log de diagnostic
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ ERREUR : La variable DISCORD_TOKEN est absente de Render !");
} else {
    console.log("🔑 Token trouvé. Connexion à Discord...");
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error("❌ ÉCHEC CONNEXION DISCORD :", err.message);
    });
}
