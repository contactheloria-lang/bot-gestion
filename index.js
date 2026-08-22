const { Client, GatewayIntentBits, Partials, ActivityType, PermissionFlagsBits } = require('discord.js');
const express = require('express');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// =====================================================
// INITIALISATION & STATUT DE MAINTENANCE
// =====================================================
client.once('ready', async (c) => {
    console.log(`\n==========================================`);
    console.log(`🚨 [SYSTEM - BOT GESTION] Mode Maintenance Intégral`);
    console.log(`Connecté en tant que : ${c.user.tag}`);
    console.log(`==========================================\n`);

    // Statut personnalisé : Panne majeure
    client.user.setPresence({
        activities: [{
            name: "⚠️ Panne majeure | Durée estimée : 12h",
            type: ActivityType.Custom
        }],
        status: 'dnd'
    });
});

// =====================================================
// BLOQUER TOUTES LES INTERACTIONS (COMMANDES / BOUTONS)
// =====================================================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isCommand()) {
        return interaction.reply({
            content: "🚨 **Maintenance majeure en cours :** L'intégralité des fonctionnalités du bot (tickets, rôles, vocal) est temporairement suspendue. Durée estimée : 12h.",
            ephemeral: true
        }).catch(() => {});
    }
});

// =====================================================
// RESTRICTION ÉCRITURE NOCTURNE (00h00 — 07h00)
// =====================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Ignorer le staff / administrateurs
    if (message.member && message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    const currentHour = new Date().getHours();

    // Vérification du créneau : entre 00h00 et 07h00
    if (currentHour >= 0 && currentHour < 7) {
        try {
            await message.delete();
            
            // Notification en message privé
            await message.author.send(
                `🌙 **Fermeture nocturne :** Les salons textuels sont fermés de **00h00 à 07h00**. Toutes vos demandes au staff doivent s'effectuer en privé pendant ce créneau.`
            ).catch(() => {});
        } catch (err) {
            console.error("❌ Impossible de supprimer le message nocturne :", err.message);
        }
    }
});

// =====================================================
// RESTRICTION VOCAL NOCTURNE (04h00 — 07h00)
// =====================================================
client.on('voiceStateUpdate', async (oldState, newState) => {
    // Si l'utilisateur rejoint ou change de salon vocal
    if (!oldState.channelId && newState.channelId) {
        if (newState.member && newState.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const currentHour = new Date().getHours();

        // Vérification du créneau : entre 04h00 et 07h00
        if (currentHour >= 4 && currentHour < 7) {
            try {
                // Déconnexion de l'utilisateur du salon vocal
                await newState.disconnect("Salons vocaux indisponibles entre 04h00 et 07h00");

                // Prévenir le membre en MP
                await newState.member.send(
                    `🛑 **Accès Vocal Restreint :** Les salons vocaux ne sont pas disponibles entre **04h00 et 07h00** du matin.`
                ).catch(() => {});
            } catch (err) {
                console.error("❌ Impossible de déconnecter le membre du vocal :", err.message);
            }
        }
    }
});

// =====================================================
// GESTION DES ERREURS GLOBALES (ANTI-CRASH)
// =====================================================
client.on('error', (error) => console.error('⚠️ [DISCORD API ERROR]', error));
process.on('unhandledRejection', (reason) => console.error('⚠️ [UNHANDLED REJECTION]', reason));
process.on('uncaughtException', (error) => console.error('⚠️ [UNCAUGHT EXCEPTION]', error));

// =====================================================
// SERVEUR WEB EXPRESS
// =====================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🚨 Bot HeLoRiA Gestion — Mode Maintenance Actif'));
app.listen(PORT, () => console.log(`🌐 [Render WebServer] Actif sur le port ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
