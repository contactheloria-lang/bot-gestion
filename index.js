const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Chargement des modules systèmes
const voiceManager = require('./modules/voiceManager');
const welcomeManager = require('./modules/welcomeManager');
const roleManager = require('./modules/roleManager');
const ticketSystem = require('./modules/ticketSystem');

// Chargement des modules Embeds / Salons d'information depuis le dossier ./embeds/
const voiceInfo = require('./embeds/voiceInfo');
const infoPack = require('./embeds/infoPack');
const soutenir = require('./embeds/soutenir');
const partenaire = require('./embeds/partenaire');
const reglement = require('./embeds/reglement');
const presentation = require('./embeds/presentation');
const critereEsport = require('./embeds/critereEsport');

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
// GESTION DU STOCKAGE DES IDs DE MESSAGES
// =====================================================
const STORE_PATH = path.join(__dirname, './data/embed_messages.json');

// S'assurer que le dossier data existe
if (!fs.existsSync(path.dirname(STORE_PATH))) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

function loadEmbedStore() {
    try {
        if (fs.existsSync(STORE_PATH)) {
            return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('⚠️ [EMBED STORE] Erreur de lecture du stockage des embeds :', err);
    }
    return {};
}

function saveEmbedStore(data) {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 4), 'utf-8');
    } catch (err) {
        console.error('⚠️ [EMBED STORE] Erreur d\'écriture du stockage des embeds :', err);
    }
}

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
// FONCTION DE DÉPLOIEMENT/MISE À JOUR DES EMBEDS
// =====================================================
async function sendOrUpdateEmbeds() {
    console.log('\n📥 [EMBEDS] Démarrage du contrôle des messages d\'information...');

    const store = loadEmbedStore();

    // Fonction intelligente : Édite si le message existe, sinon l'envoie
    const deployEmbed = async (channelId, embedData, key) => {
        try {
            if (!channelId || channelId.includes('ID_SALON') || channelId.includes('TON_ID')) {
                console.warn(`⚠️ [EMBEDS] ${key} ignoré : ID de salon non renseigné.`);
                return;
            }

            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                console.error(`❌ [EMBEDS] Salon introuvable pour ${key} (ID: ${channelId})`);
                return;
            }

            const embedsToSend = Array.isArray(embedData) ? embedData : [embedData];
            const existingMsgId = store[key];

            if (existingMsgId) {
                // Tenter de récupérer le message existant
                const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
                if (existingMsg) {
                    await existingMsg.edit({ embeds: embedsToSend });
                    console.log(`🔄 [EMBEDS] ${key} mis à jour dans <#${channelId}>.`);
                    return;
                }
            }

            // Si le message n'existe pas ou a été supprimé, on l'envoie
            const newMsg = await channel.send({ embeds: embedsToSend });
            store[key] = newMsg.id;
            saveEmbedStore(store);
            console.log(`✅ [EMBEDS] ${key} posté (nouveau message) dans <#${channelId}>.`);

        } catch (err) {
            console.error(`❌ [EMBEDS ERROR] Échec lors du traitement de ${key} :`, err.message);
        }
    };

    // 1. Salons d'accompagnement vocal (Multi-salons)
    for (let i = 0; i < voiceInfo.VOICE_CHANNEL_IDS.length; i++) {
        const channelId = voiceInfo.VOICE_CHANNEL_IDS[i];
        await deployEmbed(channelId, voiceInfo.createVoiceEmbed(), `Voice_Info_${i}`);
    }

    // 2. InfoPack (Projets)
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.MAILLOT, infoPack.getMaillotEmbed(), 'InfoPack_Maillot');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.MAP_1V1, infoPack.getMapEmbed(), 'InfoPack_Map1v1');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.CODE_CREATEUR, infoPack.getCreatorCodeEmbed(), 'InfoPack_CodeCreateur');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.LOI_1901, infoPack.getLoi1901Embed(), 'InfoPack_Loi1901');

    // 3. Soutenir
    await deployEmbed(soutenir.SOUTENIR_CHANNEL_ID, soutenir.createSoutenirEmbed(), 'Soutenir');

    // 4. Partenaire
    await deployEmbed(partenaire.PARTENAIRE_CHANNEL_ID, partenaire.createPartenaireEmbed(), 'Partenaire');

    // 5. Règlement
    await deployEmbed(reglement.REGLEMENT_CHANNEL_ID, reglement.createReglementEmbeds(), 'Reglement');

    // 6. Présentation
    await deployEmbed(presentation.PRESENTATION_CHANNEL_ID, presentation.createPresentationEmbeds(), 'Presentation');

    // 7. Critères Esport
    await deployEmbed(critereEsport.CRITERE_CHANNEL_ID, critereEsport.createCritereEmbeds(), 'CritereEsport');

    console.log('✨ [EMBEDS] Vérification et mise à jour terminées.\n');
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

    // Déploiement/Mise à jour sans doublons
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