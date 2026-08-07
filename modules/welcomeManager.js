const { EmbedBuilder } = require("discord.js");
const config = require("../data/welcomeConfig");

const invitesCache = new Map();

module.exports = (client) => {
    console.log("[SYSTEM] Onboarding et suivi d'invitations initialisés.");

    // Chargement de l'état des invitations au lancement
    client.once("ready", async () => {
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) return;

        const invites = await guild.invites.fetch().catch(() => null);
        if (invites) {
            invitesCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
        }
    });

    // Journalisation à la création d'un nouveau lien d'invitation
    client.on("inviteCreate", async (invite) => {
        if (invite.guild.id !== config.GUILD_ID) return;

        const guildInvites = invitesCache.get(invite.guild.id) || new Map();
        guildInvites.set(invite.code, invite.uses);
        invitesCache.set(invite.guild.id, guildInvites);

        const creator = invite.inviter ? `${invite.inviter.username} (${invite.inviter.id})` : "Inconnu";

        const logInviteEmbed = new EmbedBuilder()
            .setColor("#2B2D31")
            .setTitle("Création d'une invitation")
            .addFields(
                { name: "Code", value: `\`${invite.code}\``, inline: true },
                { name: "Créateur", value: creator, inline: true },
                { name: "Salon ciblé", value: `${invite.channel}`, inline: true }
            )
            .setTimestamp();

        const logChannel = await client.channels.fetch(config.CHANNELS.LOGS_INVITES).catch(() => null);
        if (logChannel) logChannel.send({ embeds: [logInviteEmbed] }).catch(() => {});
    });

    // Prise en charge des arrivées
    client.on("guildMemberAdd", async (member) => {
        if (member.guild.id !== config.GUILD_ID) return;

        const guild = member.guild;
        const memberCount = guild.memberCount;

        // Auto-Role
        if (config.AUTO_ROLE_ID && config.AUTO_ROLE_ID !== "") {
            await member.roles.add(config.AUTO_ROLE_ID).catch(() => {});
        }

        // Identification précise du code d'invitation utilisé
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
                    oldInvites.set(code, invite.uses);
                    break;
                }
            }
        }

        if (newInvites) {
            invitesCache.set(guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
        }

        // Message public de bienvenue (Sobriété & Professionnalisme)
        const welcomeChannel = await guild.channels.fetch(config.CHANNELS.WELCOME).catch(() => null);
        if (welcomeChannel) {
            const inviterText = inviterUser ? `${inviterUser.username}` : "Lien Personnalisé / Discord";
            const scoreText = inviterUser ? `(${inviteUses} invitations)` : "";

            const welcomeEmbed = new EmbedBuilder()
                .setColor("#2B2D31")
                .setTitle("AEROZ ESPORTS — BIENVENUE")
                .setDescription(`Bienvenue sur le serveur officiel d'Aeroz Esports, ${member}.`)
                .addFields(
                    { name: "Membre numéro", value: `${memberCount}`, inline: true },
                    { name: "Invité par", value: `${inviterText} ${scoreText}`, inline: true }
                )
                .setThumbnail(config.LOGO_URL)
                .setFooter({ text: `Aeroz Esports • Effectif actuel : ${memberCount}` })
                .setTimestamp();

            welcomeChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
        }

        // Logs techniques des membres (Interne staff)
        const logMembreChannel = await client.channels.fetch(config.CHANNELS.LOGS_MEMBRES).catch(() => null);
        if (logMembreChannel) {
            const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);

            const joinEmbed = new EmbedBuilder()
                .setColor("#2ecc71")
                .setTitle("Nouveau membre")
                .addFields(
                    { name: "Utilisateur", value: `${member.user.username}`, inline: true },
                    { name: "Identifiant", value: `\`${member.id}\``, inline: true },
                    { name: "Création du compte", value: `<t:${createdTimestamp}:f> (<t:${createdTimestamp}:R>)`, inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
                .setTimestamp();

            logMembreChannel.send({ embeds: [joinEmbed] }).catch(() => {});
        }

        // Logs détaillés du tracking d'invitation
        const logInviteChannel = await client.channels.fetch(config.CHANNELS.LOGS_INVITES).catch(() => null);
        if (logInviteChannel) {
            const infoInviteEmbed = new EmbedBuilder()
                .setColor("#3498db")
                .setTitle("Suivi des invitations")
                .addFields(
                    { name: "Membre rejoint", value: `${member.user.username} (\`${member.id}\`)`, inline: false },
                    { name: "Auteur de l'invitation", value: inviterUser ? `${inviterUser.username} (\`${inviterUser.id}\`)` : "Inconnu / Vanity", inline: true },
                    { name: "Code utilisé", value: inviteCodeUsed ? `\`${inviteCodeUsed}\`` : "N/A", inline: true },
                    { name: "Total invitations de l'auteur", value: `\`${inviteUses}\``, inline: true }
                )
                .setTimestamp();

            logInviteChannel.send({ embeds: [infoInviteEmbed] }).catch(() => {});
        }
    });

    // Prise en charge des départs
    client.on("guildMemberRemove", async (member) => {
        if (member.guild.id !== config.GUILD_ID) return;

        const logMembreChannel = await client.channels.fetch(config.CHANNELS.LOGS_MEMBRES).catch(() => null);
        if (logMembreChannel) {
            const leaveEmbed = new EmbedBuilder()
                .setColor("#e74c3c")
                .setTitle("Départ d'un membre")
                .addFields(
                    { name: "Utilisateur", value: `${member.user.username}`, inline: true },
                    { name: "Identifiant", value: `\`${member.id}\``, inline: true },
                    { name: "Effectif restant", value: `${member.guild.memberCount}`, inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
                .setTimestamp();

            logMembreChannel.send({ embeds: [leaveEmbed] }).catch(() => {});
        }
    });
};