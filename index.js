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

// Importation des modules
const initTicketSystem = require('./modules/ticketSystem');
const initVoiceManager = require('./modules/voiceManager');
// const initEmbedModule = require('./modules/embedModule'); // DÉSACTIVÉ : Ne pas renvoyer d'embeds via ce module

client.once('ready', async (c) => {
    console.log(`\n==========================================`);
    console.log(`✅ [HELORIA GESTION] Connecté sous : ${c.user.tag}`);
    console.log(`⚙️  Modules actifs : Tickets, Vocaux`);
    console.log(`🚫 Module désactivé : Embeds`);
    console.log(`==========================================\n`);

    // Initialisation des modules
    await initTicketSystem(client);
    if (typeof initVoiceManager === 'function') initVoiceManager(client);

    client.user.setPresence({
        status: 'online',
        activities: [
            {
                name: '⚙️ Gestion & Support | Team HeLoRiA',
                type: ActivityType.Custom
            }
        ]
    });
});

// Serveur Web Express (Maintient le bot éveillé)
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

client.login(process.env.DISCORD_TOKEN);
