const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const express = require('express');
require('dotenv').config();

// Chargement des modules systèmes
const voiceManager = require('./modules/voiceManager');
const welcomeManager = require('./modules/welcomeManager');
const roleManager = require('./modules/roleManager');
const ticketSystem = require('./modules/ticketSystem');

// Chargement des modules Embeds / Salons d'information
const voiceInfo = require('./voiceInfo');
const infoPack = require('./infoPack');
const soutenir = require('./soutenir');
const partenaire = require('./partenaire');
const reglement = require('./reglement');
const presentation = require('./presentation');
const critereEsport = require('./critereEsport');

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
// GESTION DES ERREURS GLOBALES
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
// FONCTION D'ENVOI AUTOMATIQUE DES EMBEDS (POST/UPDATE)
// =====================================================
async function sendOrUpdateEmbeds() {
    console.log('\n📥 [EMBEDS] Démarrage du déploiement des messages d\'information...');

    // Fonction utilitaire sécurisée pour poster des embeds
    const deployEmbed = async (channelId, embedData, name) => {
        try {
            if (!channelId || channelId.includes('ID_SALON') || channelId.includes('TON_ID')) {
                console.warn(`⚠️ [EMBEDS] ${name} ignoré : ID non renseigné.`);
                return;
            }

            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                console.error(`❌ [EMBEDS] Salon introuvable pour ${name} (ID: ${channelId})`);
                return;
            }

            const embedsToSend = Array.isArray(embedData) ? embedData : [embedData];
            await channel.send({ embeds: embedsToSend });
            console.log(`✅ [EMBEDS] ${name} posté avec succès dans <#${channelId}>.`);
        } catch (err) {
            console.error(`❌ [EMBEDS ERROR] Échec lors de l'envoi de ${name} :`, err.message);
        }
    };

    // 1. Salons d'accompagnement vocal (Verrouillés)
    for (const channelId of voiceInfo.VOICE_CHANNEL_IDS) {
        await deployEmbed(channelId, voiceInfo.createVoiceEmbed(), 'Accompagnement Vocal');
    }

    // 2. InfoPack (Projets en préparation)
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.MAILLOT, infoPack.getMaillotEmbed(), 'Maillot');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.MAP_1V1, infoPack.getMapEmbed(), 'Map 1v1');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.CODE_CREATEUR, infoPack.getCreatorCodeEmbed(), 'Code Créateur');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.LOI_1901, infoPack.getLoi1901Embed(), 'Loi 1901');

    // 3. Soutenir
    await deployEmbed(soutenir.SOUTENIR_CHANNEL_ID, soutenir.createSoutenirEmbed(), 'Nous Soutenir');

    // 4. Partenaire
    await deployEmbed(partenaire.PARTENAIRE_CHANNEL_ID, partenaire.createPartenaireEmbed(), 'Partenaires');

    // 5. Règlement (Multi-embeds)
    await deployEmbed(reglement.REGLEMENT_CHANNEL_ID, reglement.createReglementEmbeds(), 'Règlement Officiel');

    // 6. Présentation (Multi-embeds)
    await deployEmbed(presentation.PRESENTATION_CHANNEL_ID, presentation.createPresentationEmbeds(), 'Présentation Institutionnelle');

    // 7. Critères Esport (Multi-embeds)
    await deployEmbed(critereEsport.CRITERE_CHANNEL_ID, critereEsport.createCritereEmbeds(), 'Critères Esport');

    console.log('✨ [EMBEDS] Traitement des messages d\'information terminé.\n');
}

// =====================================================
// INITIALISATION DU BOT (CLIENT READY)
// =====================================================
client.once('ready', async (c) => {
    console.log(`\n==========================================`);
    console.log(`✅ [SYSTEM] Connecté en tant que : ${c.user.tag}`);
    console.log(`🔊  Gestionnaire Vocal : Opérationnel`);
    console.log(`👋  Gestionnaire d'Accueil : Opérationnel`);
    console.log(`🎭  Gestionnaire d'Auto-Rôle : Opérationnel`);
    console.log(`🎫  Système de Tickets : Opérationnel`);
    console.log(`==========================================\n`);

    // Initialisation des modules principaux
    try {
        if (typeof voiceManager === 'function') voiceManager(client);
        if (typeof welcomeManager === 'function') welcomeManager(client);
        if (typeof roleManager === 'function') roleManager(client);
        if (typeof ticketSystem === 'function') ticketSystem(client);
    } catch (err) {
        console.error('❌ [MODULE ERROR] Erreur au chargement des modules :', err);
    }

    // Déploiement automatique des embeds informatifs
    await sendOrUpdateEmbeds();

    // =====================================================
    // STATUT DYNAMIQUE (MODE IDLE)
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

app.get('/', (req, res) => res.send('⚙️ Bot HeLoRiA est en ligne !'));
app.listen(PORT, () => console.log(`🌐 [Render WebServer] Actif sur le port ${PORT}`));

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);