const { EmbedBuilder } = require("discord.js");
const config = require("../data/welcomeConfig");

const COLOR_GOLD = "#D4AF37";
const COLOR_JOIN = "#2ECC71";
const COLOR_LEAVE = "#E74C3C";
const COLOR_INFO = "#3498DB";

const EMOJIS = {
    WELCOME: "<:5647premiumicon:1533535330538360942>",
    CERTIFIED: "<:20336certified:1537579306690281544>",
    STAR: "⭐",
    MEMBERS: "👥",
    INVITE: "📩",
    RULES: "📜",
    ROLES: "🎭",
    SUPPORT: "🎫",
    GEAR: "⚙️",
    JOIN: "🟢",
    LEAVE: "🔴",
    LINK: "🔗"
};

const invitesCache = new Map();

module.exports = (client) => {
    console.log("[SYSTEM] Initialisation de l'onboarding et du suivi d'invitations HeLoRiA...");

    const getChannel = async (guild, channelId) => {
        if (!channelId) return null;
        return guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    };

    client.once("ready", async () => {
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) return;

        const invites = await guild.invites.fetch().catch(() => null);
        if (invites) {
            invitesCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
        }
    });

    client.on("inviteCreate", async (invite) => {
        if (invite.guild.id !== config.GUILD_ID) return;

        const guildInvites = invitesCache.get(invite.guild.id) || new Map();
        guildInvites.set(invite.code, invite.uses);
        invitesCache.set(invite.guild.id, guildInvites);

        const creator = invite.inviter ? `**${invite.inviter.username}** (\`${invite.inviter.id}\`)` : "Inconnu";

        const logInviteEmbed = new EmbedBuilder()
            .setColor(COLOR_GOLD)
            .setTitle(`${EMOJIS.LINK} NOUVELLE INVITATION CRÉÉE`)
            .addFields(
                { name: `${EMOJIS.GEAR} Code`, value: `\`${invite.code}\``, inline: true },
                { name: `${EMOJIS.STAR} Créateur`, value: creator, inline: true },
                { name: `${EMOJIS.WELCOME} Salon ciblé`, value: `${invite.channel}`, inline: true }
            )
            .setFooter({ text: "HeLoRiA • Traçabilité des Liens" })
            .setTimestamp();

        const logChannel = await getChannel(invite.guild, config.CHANNELS.LOGS_INVITES);
        if (logChannel) logChannel.send({ embeds: [logInviteEmbed] }).catch(() => {});
    });

    client.on("guildMemberAdd", async (member) => {
        if (member.guild.id !== config.GUILD_ID) return;

        const guild = member.guild;
        const memberCount = guild.memberCount;

        if (config.AUTO_ROLE_ID) {
            await member.roles.add(config.AUTO_ROLE_ID).catch(() => {});
        }

        let inviterUser = null;
        let inviteCodeUsed = null;
        let inviteUses = 0;

        const oldInvites = invitesCache.get(guild.id);
        const newInvites = await guild.invites.fetch().catch(() => null);

        if (newInvites && oldInvites) {
            for (const [code, invite] of newInvites) {
                const oldUses = oldInvites.get(code) || 0;
                if (invite.uses > oldUses) {
                    inviterUser = invite.inviter;
                    inviteCodeUsed = code;
                    inviteUses = invite.uses;
                    break;
                }
            }
        }

        if (newInvites) {
            invitesCache.set(guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
        }

        const welcomeChannel = await getChannel(guild, config.CHANNELS.WELCOME);
        if (welcomeChannel) {
            const inviterText = inviterUser ? `**${inviterUser.username}**` : "Lien Personnalisé / Discord";
            const scoreText = inviterUser ? `(\`${inviteUses}\` invitations)` : "";

            const welcomeEmbed = new EmbedBuilder()
                .setColor(COLOR_GOLD)
                .setTitle(`${EMOJIS.WELCOME} BIENVENUE CHEZ HELORIA`)
                .setDescription(
                    `Ravi de t'accueillir parmi nous, ${member} !\n` +
                    `Tu viens de rejoindre la communauté officielle d'**HeLoRiA**.\n\n` +
                    `─── **INFORMATIONS D'ARRIVÉE** ───\n\n` +
                    `• ${EMOJIS.MEMBERS} **Effectif :** Tu es notre **${memberCount}e** membre !\n` +
                    `• ${EMOJIS.INVITE} **Invitation :** Rejoint grâce à ${inviterText} ${scoreText}\n\n` +
                    `─── **GUIDE DE DÉMARRAGE** ───\n\n` +
                    `• ${EMOJIS.RULES} **Règlement :** Consulte le salon des règles pour naviguer sereinement.\n` +
                    `• ${EMOJIS.ROLES} **Rôles :** Prends tes accès et consoles dans le salon des rôles.\n` +
                    `• ${EMOJIS.SUPPORT} **Besoin d'aide ?** L'équipe Staff reste à ta disposition via les tickets.`
                )
                .setThumbnail(member.user.displayAvatarURL({ forceStatic: false, size: 512 }))
                .setImage(config.BANNER_URL || null)
                .setFooter({ text: `HeLoRiA • Effectif global : ${memberCount} membres`, iconURL: config.LOGO_URL })
                .setTimestamp();

            welcomeChannel.send({ content: `👋 Bienvenue ${member} !`, embeds: [welcomeEmbed] }).catch(() => {});
        }

        const logMembreChannel = await getChannel(guild, config.CHANNELS.LOGS_MEMBRES);
        if (logMembreChannel) {
            const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);

            const joinEmbed = new EmbedBuilder()
                .setColor(COLOR_JOIN)
                .setTitle(`${EMOJIS.JOIN} NOUVEAU MEMBRE REJOIN`)
                .addFields(
                    { name: "Utilisateur", value: `${member.user.tag}`, inline: true },
                    { name: "Identifiant", value: `\`${member.id}\``, inline: true },
                    { name: "Création du compte", value: `<t:${createdTimestamp}:f> (<t:${createdTimestamp}:R>)`, inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
                .setFooter({ text: "HeLoRiA • Registre des Membres" })
                .setTimestamp();

            logMembreChannel.send({ embeds: [joinEmbed] }).catch(() => {});
        }

        const logInviteChannel = await getChannel(guild, config.CHANNELS.LOGS_INVITES);
        if (logInviteChannel) {
            const infoInviteEmbed = new EmbedBuilder()
                .setColor(COLOR_INFO)
                .setTitle(`${EMOJIS.INVITE} SUIVI D'INVITATION`)
                .addFields(
                    { name: "Membre rejoint", value: `${member.user.username} (\`${member.id}\`)`, inline: false },
                    { name: "Auteur de l'invitation", value: inviterUser ? `${inviterUser.username} (\`${inviterUser.id}\`)` : "Inconnu / Vanity", inline: true },
                    { name: "Code utilisé", value: inviteCodeUsed ? `\`${inviteCodeUsed}\`` : "N/A", inline: true },
                    { name: "Total d'invitations", value: `\`${inviteUses}\``, inline: true }
                )
                .setFooter({ text: "HeLoRiA • Traçabilité des Invitations" })
                .setTimestamp();

            logInviteChannel.send({ embeds: [infoInviteEmbed] }).catch(() => {});
        }
    });

    client.on("guildMemberRemove", async (member) => {
        if (member.guild.id !== config.GUILD_ID) return;

        const logMembreChannel = await getChannel(member.guild, config.CHANNELS.LOGS_MEMBRES);
        if (logMembreChannel) {
            const leaveEmbed = new EmbedBuilder()
                .setColor(COLOR_LEAVE)
                .setTitle(`${EMOJIS.LEAVE} DÉPART D'UN MEMBRE`)
                .addFields(
                    { name: "Utilisateur", value: `${member.user?.tag || "Utilisateur Inconnu"}`, inline: true },
                    { name: "Identifiant", value: `\`${member.id}\``, inline: true },
                    { name: "Effectif restant", value: `\`${member.guild.memberCount}\` membres`, inline: false }
                )
                .setThumbnail(member.user?.displayAvatarURL({ forceStatic: false }) || null)
                .setFooter({ text: "HeLoRiA • Registre des Membres" })
                .setTimestamp();

            logMembreChannel.send({ embeds: [leaveEmbed] }).catch(() => {});
        }
    });
};
