const { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// DÉCLARATION DES EMOJIS PERSONNALISÉS
const EMOJIS = {
    TELESCOPE: '<:65264telescope:1537586517453832222>',
    CROWN: '<a:darkbluecrown:1533535362566324245>',
    QUILL: '<:6880quill:1537585310794391563>',
    HLRWIN: '<:hlrwin:1537584105536094248>',
    RULES: '<:580437rules:1537583160345366578>',
    TRIALMOD: '<:94919trialmod:1537582836318609521>',
    MIC: '<:68052micanimation:1537582247278813204>',
    BLURPLE_MOD: '<:3446blurplecertifiedmoderator:1533535324309815367>',
    BLURPLE_BAN: '<:9299blurpleban:1533535325996056807>',
    TICKET: '<:29909ticket:1537580036159316108>',
    BRIEFCASE: '<:75828briefcase:1537579702812807248>',
    CERTIFIED: '<:20336certified:1537579306690281544>',
    HANDSHAKE: '<:600404handshake:1537578056447828058>',
    PAYPAL: '<:1716_PAYPAL:1537578291593093240>',
    MONEY: '<:63043moneyspread:1537577805829636117>',
    PREMIUM: '<:5647premiumicon:1533535330538360942>',
    LOCK: '<a:lockicon:1533535370787033198>',
    UPDATE: '<:update:1533535384674369777>',
    LOADING: '<a:loadingicon:1533535386951749683>',
    WARNING: '<:warningd:1533535400176386068>'
};

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

// État global de la maintenance
let isMaintenanceActive = false;

// =====================================================
// GESTION DU STOCKAGE DES IDs DE MESSAGES
// =====================================================
const STORE_PATH = path.join(__dirname, './data/embed_messages.json');

if (!fs.existsSync(path.dirname(STORE_PATH))) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

function loadEmbedStore() {
    try {
        if (fs.existsSync(STORE_PATH)) {
            return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('⚠️ [EMBED STORE] Erreur de lecture :', err);
    }
    return {};
}

function saveEmbedStore(data) {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 4), 'utf-8');
    } catch (err) {
        console.error('⚠️ [EMBED STORE] Erreur d\'écriture :', err);
    }
}

// =====================================================
// GESTION DES ERREURS GLOBALES
// =====================================================
client.on('error', (error) => console.error('⚠️ [DISCORD API ERROR]', error));
process.on('unhandledRejection', (reason) => console.error('⚠️ [UNHANDLED REJECTION]', reason));
process.on('uncaughtException', (error) => console.error('⚠️ [UNCAUGHT EXCEPTION]', error));

// =====================================================
// FONCTION DE DÉPLOIEMENT/MISE À JOUR DES EMBEDS
// =====================================================
async function sendOrUpdateEmbeds() {
    console.log('\n📥 [EMBEDS] Démarrage du contrôle des messages d\'information...');
    const store = loadEmbedStore();

    const deployEmbed = async (channelId, embedData, key) => {
        try {
            if (!channelId || channelId.includes('ID_SALON') || channelId.includes('TON_ID')) return;

            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) return;

            const embedsToSend = Array.isArray(embedData) ? embedData : [embedData];
            const existingMsgId = store[key];

            if (existingMsgId) {
                const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
                if (existingMsg) {
                    await existingMsg.edit({ embeds: embedsToSend });
                    return;
                }
            }

            const newMsg = await channel.send({ embeds: embedsToSend });
            store[key] = newMsg.id;
            saveEmbedStore(store);

        } catch (err) {
            console.error(`❌ [EMBEDS ERROR] ${key} :`, err.message);
        }
    };

    for (let i = 0; i < voiceInfo.VOICE_CHANNEL_IDS.length; i++) {
        await deployEmbed(voiceInfo.VOICE_CHANNEL_IDS[i], voiceInfo.createVoiceEmbed(), `Voice_Info_${i}`);
    }

    await deployEmbed(infoPack.INFO_CHANNEL_IDS.MAILLOT, infoPack.getMaillotEmbed(), 'InfoPack_Maillot');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.MAP_1V1, infoPack.getMapEmbed(), 'InfoPack_Map1v1');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.CODE_CREATEUR, infoPack.getCreatorCodeEmbed(), 'InfoPack_CodeCreateur');
    await deployEmbed(infoPack.INFO_CHANNEL_IDS.LOI_1901, infoPack.getLoi1901Embed(), 'InfoPack_Loi1901');

    await deployEmbed(soutenir.SOUTENIR_CHANNEL_ID, soutenir.createSoutenirEmbed(), 'Soutenir');
    await deployEmbed(partenaire.PARTENAIRE_CHANNEL_ID, partenaire.createPartenaireEmbed(), 'Partenaire');
    await deployEmbed(reglement.REGLEMENT_CHANNEL_ID, reglement.createReglementEmbeds(), 'Reglement');
    await deployEmbed(presentation.PRESENTATION_CHANNEL_ID, presentation.createPresentationEmbeds(), 'Presentation');
    await deployEmbed(critereEsport.CRITERE_CHANNEL_ID, critereEsport.createCritereEmbeds(), 'CritereEsport');

    console.log('✨ [EMBEDS] Vérification et mise à jour terminées.\n');
}

// =====================================================
// INITIALISATION DU BOT
// =====================================================
client.once('ready', async (c) => {
    console.log(`\n==========================================`);
    console.log(`✅ [SYSTEM] Connecté en tant que : ${c.user.tag}`);
    console.log(`==========================================\n`);

    try {
        if (typeof voiceManager === 'function') voiceManager(client);
        if (typeof welcomeManager === 'function') welcomeManager(client);
        if (typeof roleManager === 'function') roleManager(client);
        if (typeof ticketSystem === 'function') ticketSystem(client);
    } catch (err) {
        console.error('❌ [MODULE ERROR] Erreur au chargement des modules :', err);
    }

    await sendOrUpdateEmbeds();

    // Boucle de statut dynamique
    let statusIndex = 0;
    setInterval(async () => {
        if (isMaintenanceActive) {
            client.user.setPresence({
                activities: [{ name: "CustomStatus", state: "Maintenance en cours", type: ActivityType.Custom }],
                status: 'dnd'
            });
            return;
        }

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
// SÉCURITÉ DE INTERACTION (BLOCAGE DES TICKETS EN MAINTENANCE)
// =====================================================
client.on('interactionCreate', async (interaction) => {
    if (!isMaintenanceActive) return;

    // Détection des interactions liées au système de ticket (Boutons ou Menu Déroulant)
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (interaction.customId.includes('ticket') || interaction.customId.includes('open_ticket')) {
            return interaction.reply({
                content: `${EMOJIS.WARNING} **Maintenance en cours**\n\n${EMOJIS.LOCK} *Le système de ticket est actuellement indisponible.*\n${EMOJIS.LOADING} Le problème sera résolu dans **1 à 2 heures**. Veuillez patienter, merci de votre compréhension !`,
                ephemeral: true
            });
        }
    }
});

// =====================================================
// COMMANDES DE MAINTENANCE
// =====================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!maintenance') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Permission insuffisante.");
        }

        isMaintenanceActive = true;

        // Statut 'dnd' immédiat
        client.user.setPresence({
            activities: [{ name: "CustomStatus", state: "Maintenance en cours", type: ActivityType.Custom }],
            status: 'dnd'
        });

        // Embed Principal 1 : Annonce Officielle
        const mainEmbed = new EmbedBuilder()
            .setTitle(`${EMOJIS.WARNING} ${EMOJIS.LOCK} INTERVENTION TECHNIQUE URGENTE ${EMOJIS.LOCK} ${EMOJIS.WARNING}`)
            .setDescription(
                `# ${EMOJIS.CROWN} **INTERRUPTION TEMPORAIRE DES SERVICES**\n\n` +
                `> ${EMOJIS.QUILL} ***Chers membres de HeLoRiA,***\n` +
                `Une maintenance technique d'urgence est actuellement appliquée sur nos infrastructures afin d'effectuer des mises à jour majeures et corriger des dysfonctionnements sur nos modules principaux.\n\n` +
                `~~` + '─'.repeat(30) + `~~\n\n` +
                `### ${EMOJIS.UPDATE} **SITUATION ACTUELLE**\n` +
                `* ${EMOJIS.TICKET} **Module Support & Tickets :** **\` HORS SERVICE \`**\n` +
                `* ${EMOJIS.BRIEFCASE} **Recrutements Joueurs :** **\` INACCESSIBLES \`**\n` +
                `* ${EMOJIS.CERTIFIED} **Systèmes d'Auto-Rôles :** **\` INDISPONIBLES \`**\n` +
                `* ${EMOJIS.MIC} **Salons Vocaux Automatisés :** **\` PERTURBÉS \`**\n\n` +
                `~~` + '─'.repeat(30) + `~~`
            )
            .setColor(0xFF4500)
            .setThumbnail(client.user.displayAvatarURL());

        // Embed Principal 2 : Détails & Délais
        const detailEmbed = new EmbedBuilder()
            .setTitle(`${EMOJIS.TELESCOPE} **DÉTAILS ET TEMPS D'ATTENTE**`)
            .setDescription(
                `### ${EMOJIS.LOADING} **DURÉE ESTIMÉE DE L'INTERVENTION**\n` +
                `> **\` 1 À 2 HEURES AU MAXIMUM \`**\n\n` +
                `Nos développeurs travaillent activement pour rétablir l'intégralité des fonctionnalités dans les plus brefs délais. ***Veuillez ne pas tenter d'ouvrir de tickets pendant cette période.***\n\n` +
                `### ${EMOJIS.RULES} **CONSIGNES PENDANT LA MAINTENANCE**\n` +
                `1. ${EMOJIS.BLURPLE_MOD} **Patience requis :** Merci de ne pas mentionner le staff en message privé.\n` +
                `2. ${EMOJIS.HLRWIN} **Discussions textuelles :** Les salons de discussion généraux restent ouverts.\n` +
                `3. ${EMOJIS.BLURPLE_BAN} **Sanctions :** Les abus d'ouvertures de ticket seront automatiquement bloqués.\n\n` +
                `### ${EMOJIS.PREMIUM} **SOUTENIR LE PROJET**\n` +
                `Pendant la durée des travaux, vous pouvez consulter nos informations officielles ou nous soutenir :\n` +
                `* ${EMOJIS.HANDSHAKE} **Partenariats & Projets :** Consultez nos salons d'informations.\n` +
                `* ${EMOJIS.MONEY} ${EMOJIS.PAYPAL} **Soutien :** Rendez-vous dans le salon dédié.\n\n` +
                `- - -\n` +
                `-# ${EMOJIS.CERTIFIED} Nous vous présenterons nos excuses pour la gêne occasionnée. Merci de votre confiance !`
            )
            .setColor(0xFFA500)
            .setFooter({ 
                text: "HeLoRiA System • Maintenance officielle", 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();

        // Envoi dans le salon avec notification @everyone
        await message.channel.send({
            content: "@everyone",
            embeds: [mainEmbed, detailEmbed]
        });

        if (message.deletable) await message.delete().catch(() => {});
    }

    if (message.content === '!maintenance-off') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        isMaintenanceActive = false;

        const endEmbed = new EmbedBuilder()
            .setTitle(`${EMOJIS.HLRWIN} ${EMOJIS.CERTIFIED} FIN DE LA MAINTENANCE`)
            .setDescription(
                `# ${EMOJIS.CROWN} **TOUS LES SERVICES SONT DE NOUVEAU OPÉRATIONNELS !**\n\n` +
                `> ${EMOJIS.UPDATE} **Remise en service :**\n` +
                `* ${EMOJIS.TICKET} Le système de tickets est à nouveau **ouvert**.\n` +
                `* ${EMOJIS.BRIEFCASE} Les recrutements joueurs sont **accessibles**.\n` +
                `* ${EMOJIS.MIC} Les modules vocaux et d'auto-rôles fonctionnent **parfaitement**.\n\n` +
                `-# Merci pour votre patience et bon jeu sur HeLoRiA !`
            )
            .setColor(0x00FF00)
            .setTimestamp();

        await message.channel.send({ embeds: [endEmbed] });
    }
});

// =====================================================
// SERVEUR WEB EXPRESS
// =====================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('⚙️ Bot HeLoRiA est en ligne !'));
app.listen(PORT, () => console.log(`🌐 [Render WebServer] Actif sur le port ${PORT}`));

client.login(process.env.DISCORD_TOKEN);