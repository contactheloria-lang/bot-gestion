const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const express = require('express');
require('dotenv').config();

// Chargement des modules
const voiceManager = require('./modules/voiceManager');
const welcomeManager = require('./modules/welcomeManager');
const roleManager = require('./modules/roleManager');
const ticketSystem = require('./modules/ticketSystem');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// =====================================================
// GESTION DES ERREURS (ÉVITE LES CRASHES DE CONNEXION)
// =====================================================
client.on('error', (error) => {
    console.error('⚠️ [DISCORD API ERROR]', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ [UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
    console.error('⚠️ [UNCAUGHT EXCEPTION]', error);
});

// =====================================================
// INITIALISATION DU BOT (CLIENT READY)
// =====================================================
client.once('clientReady', async (c) => {
    console.log(`\n==========================================`);
    console.log(`✅ [SYSTEM] Connecté en tant que : ${c.user.tag}`);
    console.log(`🔊  Gestionnaire Vocal : Opérationnel`);
    console.log(`👋  Gestionnaire d'Accueil : Opérationnel`);
    console.log(`🎭  Gestionnaire d'Auto-Rôle : Opérationnel`);
    console.log(`🎫  Système de Tickets : Opérationnel`);
    console.log(`==========================================\n`);

    // Initialisation des modules
    try {
        voiceManager(client);
        welcomeManager(client);
        roleManager(client);
        ticketSystem(client);
    } catch (err) {
        console.error('❌ [MODULE ERROR] Erreur au chargement des modules :', err);
    }

    // =====================================================
    // STATUT DYNAMIQUE (MODE INACTIF / IDLE)
    // =====================================================
    let statusIndex = 0;

    setInterval(async () => {
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        const activities = [
            { name: "CustomStatus", state: `${totalMembers} membres sur le serveur`, type: ActivityType.Custom },
            { name: "CustomStatus", state: `Dev By Logs`, type: ActivityType.Custom }
        ];

        client.user.setPresence({
            activities: [activities[statusIndex]],
            status: 'idle'
        });

        statusIndex = (statusIndex + 1) % activities.length;
    }, 15000);
});

// =====================================================
// SERVEUR WEB EXPRESS (RENDER / REPLIT)
// =====================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('⚙️ Bot Team HeLoRiA est en ligne !'));
app.listen(PORT, () => console.log(`🌐 [Render WebServer] Actif sur le port ${PORT}`));

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);
