const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const config = require("../data/ticket_database");

// IDS DES SALONS SYSTEME
const LOGS_CHANNEL = "1535305443847577811";
const ARCHIVE_CHANNEL = "1535305532620148736";
const AVIS_CHANNEL = "1535305562714148935"; 

// BASE DE DONNEES LOCALE
const DB_PATH = path.join(__dirname, "../data/ticket_database.json");

if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ tickets: {}, blacklist: [], stats: {} }, null, 4));

function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    } catch {
        return { tickets: {}, blacklist: [], stats: {} };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), "utf-8");
    } catch (err) {
        console.error("[TICKET DB ERROR] Erreur d'écriture :", err);
    }
}

const globalCooldowns = new Set();

module.exports = async (client) => {
    console.log("[TICKET SYSTEM] Chargement du système de support Team HeLoRiA...");

    // =====================================================
    // 1. PANNEAU PRINCIPAL
    // =====================================================
    try {
        const panelChannel = await client.channels.fetch(config.PANEL_CHANNEL).catch(() => null);
        if (panelChannel) {
            const cachedMessages = await panelChannel.messages.fetch({ limit: 10 }).catch(() => null);
            if (cachedMessages) {
                const botMessages = cachedMessages.filter(m => m.author.id === client.user.id);
                for (const msg of botMessages.values()) await msg.delete().catch(() => {});
            }

            const panelEmbed = new EmbedBuilder()
                .setColor("#FFFFFF")
                .setTitle("Team HeLoRiA — Centre d'Assistance")
                .setDescription(
                    "Besoin d'aide ou envie de tenter votre chance pour rejoindre la Team HeLoRiA ?\n" +
                    "Notre équipe vous répondra dans les plus brefs délais.\n\n" +
                    "Merci de préciser toutes les informations nécessaires lors de l'ouverture du ticket.\n\n" +
                    "Les tickets inutiles ou abusifs seront sanctionnés.\n" +
                    "Vous disposerez de 24 heures maximum pour répondre, sous peine de fermeture du ticket.\n\n" +
                    "Les règles du serveur s'appliquent également dans ces salons privés. Merci de rester respectueux et courtois avec l'ensemble du Staff.\n\n" +
                    "───\n\n" +
                    "Need assistance or want to join Team HeLoRiA?\n" +
                    "Our team will get back to you shortly.\n\n" +
                    "Please provide all relevant information once your ticket is opened.\n\n" +
                    "Useless or abusive tickets will be sanctioned.\n" +
                    "You will have a maximum of 24 hours to reply, otherwise your ticket will be closed."
                )
                .setFooter({ text: "Team HeLoRiA • Sélectionnez une option ci-dessous" });

            const menuSelection = new StringSelectMenuBuilder()
                .setCustomId("ticket_select")
                .setPlaceholder("Sélectionnez votre catégorie...")
                .addOptions([
                    { label: "Recrutement Staff", value: "staff" },
                    { label: "Recrutement Joueur", value: "joueur" },
                    { label: "Recrutement Audiovisuel", value: "audiovisuel" },
                    { label: "Assistance Générale", value: "aide" },
                    { label: "Demande de Partenariat", value: "partenariat" }
                ]);

            await panelChannel.send({
                embeds: [panelEmbed],
                components: [new ActionRowBuilder().addComponents(menuSelection)]
            }).catch(() => {});
        }
    } catch (e) {
        console.error("[PANEL INIT ERROR] :", e);
    }

    // =====================================================
    // 2. COMMANDES STAFF & SUIVI D'ACTIVITÉ
    // =====================================================
    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild) return;

        const db = readDB();
        if (db.tickets[message.channel.id]) {
            db.tickets[message.channel.id].lastActivity = Date.now();
            db.tickets[message.channel.id].messageCount = (db.tickets[message.channel.id].messageCount || 0) + 1;
            writeDB(db);
        }

        // Commande +test modérateur
        if (message.content.startsWith("+test modérateur")) {
            const allowedRoles = config.ROLES.staff || [];
            const isStaff = message.member.roles.cache.some(r => allowedRoles.includes(r.id)) || message.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            if (!isStaff) return message.reply("Action réservée à la direction.").catch(() => {});

            const targetUser = message.mentions.members.first();
            if (!targetUser) return message.reply("Veuillez mentionner le modérateur en test.").catch(() => {});

            if (config.TEST_MODO_ROLE) {
                await targetUser.roles.add(config.TEST_MODO_ROLE).catch(() => {});
            }
            await message.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});

            return message.reply({ embeds: [new EmbedBuilder().setColor("#FFFFFF").setTitle("ÉVALUATION STAFF").setDescription(`Bienvenue ${targetUser} dans votre salon de test.`)] }).catch(() => {});
        }

        // Commande +unblacklist <ID>
        if (message.content.startsWith("+unblacklist")) {
            const isStaff = message.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            if (!isStaff) return message.reply("Permission insuffisante.").catch(() => {});

            const args = message.content.split(" ");
            const targetId = args[1];
            if (!targetId) return message.reply("Veuillez indiquer l'ID de l'utilisateur à déban du support. Ex: `+unblacklist 123456789`").catch(() => {});

            if (!db.blacklist.includes(targetId)) {
                return message.reply("Cet utilisateur n'est pas dans la liste noire.").catch(() => {});
            }

            db.blacklist = db.blacklist.filter(id => id !== targetId);
            writeDB(db);
            return message.reply(`✅ L'utilisateur <@${targetId}> (\`${targetId}\`) a été débanni du système de support.`).catch(() => {});
        }

        // Commande +blacklist <ID>
        if (message.content.startsWith("+blacklist")) {
            const isStaff = message.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            if (!isStaff) return message.reply("Permission insuffisante.").catch(() => {});

            const args = message.content.split(" ");
            const targetId = args[1];
            if (!targetId) return message.reply("Veuillez indiquer l'ID de l'utilisateur. Ex: `+blacklist 123456789`").catch(() => {});

            if (!db.blacklist.includes(targetId)) {
                db.blacklist.push(targetId);
                writeDB(db);
            }
            return message.reply(`⛔ L'utilisateur <@${targetId}> (\`${targetId}\`) a été ajouté à la liste noire du support.`).catch(() => {});
        }
    });

    // =====================================================
    // 3. GESTION DES INTERACTIONS
    // =====================================================
    client.on("interactionCreate", async (i) => {
        try {
            // AVIS EN MP
            if (!i.guild) {
                const db = readDB();

                if (i.isButton() && i.customId.startsWith("rate_")) {
                    const parts = i.customId.split("_");
                    const stars = parts[1];
                    const staffId = parts[2];

                    const modal = new ModalBuilder()
                        .setCustomId(`submit_review_${stars}_${staffId}`)
                        .setTitle("Votre avis sur Team HeLoRiA");

                    modal.addComponents(new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId("comment").setLabel("Votre commentaire de satisfaction").setStyle(TextInputStyle.Paragraph).setRequired(true)
                    ));
                    return await i.showModal(modal).catch(() => {});
                }

                if (i.isModalSubmit() && i.customId.startsWith("submit_review_")) {
                    await i.deferReply({ ephemeral: true }).catch(() => {});
                    const parts = i.customId.split("_");
                    const stars = parseInt(parts[2]);
                    const staffId = parts[3];
                    const comment = i.fields.getTextInputValue("comment");

                    const reviewEmbed = new EmbedBuilder()
                        .setColor("#FFFFFF")
                        .setTitle("Nouvel Avis Support — Team HeLoRiA")
                        .addFields(
                            { name: "Staff Évalué", value: `<@${staffId}> (\`${staffId}\`)`, inline: true },
                            { name: "Note globale", value: `${stars}/5`, inline: true },
                            { name: "Auteur", value: `${i.user} (\`${i.user.id}\`)`, inline: false },
                            { name: "Commentaire", value: comment }
                        )
                        .setTimestamp();

                    if (!db.stats[staffId]) db.stats[staffId] = { closedTickets: 0, reviews: [] };
                    db.stats[staffId].reviews.push(stars);
                    writeDB(db);

                    const guildInstance = client.guilds.cache.first();
                    if (guildInstance) {
                        const reviewLogs = await guildInstance.channels.fetch(AVIS_CHANNEL).catch(() => null);
                        if (reviewLogs) await reviewLogs.send({ embeds: [reviewEmbed] }).catch(() => {});
                    }

                    return await i.editReply({ content: "Merci ! Votre évaluation a été transmise à l'équipe Team HeLoRiA." }).catch(() => {});
                }
                return;
            }

            // ANTI-SPAM BOUTONS
            if (i.isButton() || i.isStringSelectMenu()) {
                const cooldownKey = `${i.user.id}-${i.customId}`;
                if (globalCooldowns.has(cooldownKey)) {
                    if (!i.deferred && !i.replied) {
                        return await i.reply({ content: "Action trop rapide, veuillez patienter.", ephemeral: true }).catch(() => {});
                    }
                    return;
                }
                globalCooldowns.add(cooldownKey);
                setTimeout(() => globalCooldowns.delete(cooldownKey), 1200);
            }

            // OUVERTURE DU TICKET
            if (i.isStringSelectMenu() && i.customId === "ticket_select") {
                if (!i.deferred && !i.replied) await i.deferReply({ ephemeral: true }).catch(() => {});

                const db = readDB();
                const type = i.values[0];

                if (db.blacklist.includes(i.user.id)) {
                    return await i.editReply({ content: "Vous êtes banni du système de support." }).catch(() => {});
                }

                try {
                    const categoryId = config.CATEGORIES[type];
                    const basePermissions = [
                        { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                    ];

                    (config.ROLES[type] || []).forEach(rId => {
                        basePermissions.push({ 
                            id: rId, 
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] 
                        });
                    });

                    const ticketChannel = await i.guild.channels.create({
                        name: `${type}-${i.user.username}`,
                        type: ChannelType.GuildText,
                        parent: categoryId || null,
                        permissionOverwrites: basePermissions
                    });

                    db.tickets[ticketChannel.id] = {
                        userId: i.user.id,
                        username: i.user.username,
                        type: type,
                        createdAt: Date.now(),
                        lastActivity: Date.now(),
                        messageCount: 0,
                        status: "open",
                        claimedBy: null
                    };
                    writeDB(db);

                    const actionButtons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("claim").setLabel("Prendre en charge").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("close").setLabel("Fermer").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("delete").setLabel("Supprimer").setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId("blacklist_user").setLabel("Blacklist").setStyle(ButtonStyle.Danger)
                    );

                    const utilityButtons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("ticket_add_user").setLabel("Ajouter").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("ticket_remove_user").setLabel("Retirer").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("ticket_create_voice").setLabel("Salon Vocal").setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId("ticket_staff_thread").setLabel("Fil Staff Privé").setStyle(ButtonStyle.Primary)
                    );

                    const formEmbed = getFormEmbed(type);

                    await ticketChannel.send({ 
                        content: `Bonjour ${i.user} | @here Un nouveau dossier vient d'être ouvert.`, 
                        embeds: [formEmbed], 
                        components: [actionButtons, utilityButtons] 
                    }).catch(() => {});

                    return await i.editReply({ content: `Votre salon privé a été initialisé : ${ticketChannel}` }).catch(() => {});

                } catch (err) {
                    console.error("❌ Erreur lors de la création du ticket :", err);
                    return await i.editReply({ content: "Une erreur est survenue lors de la création du salon." }).catch(() => {});
                }
            }

            const db = readDB();
            const context = db.tickets[i.channel.id];

            const isStaffUser = context 
                ? (config.ROLES[context.type] || []).some(rId => i.member.roles.cache.has(rId)) || i.member.permissions.has(PermissionsBitField.Flags.ManageChannels) 
                : i.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

            // GESTION FIL PRIVE STAFF & UTILS
            if (i.isButton() && ["ticket_add_user", "ticket_remove_user", "ticket_create_voice", "ticket_staff_thread"].includes(i.customId)) {
                if (!isStaffUser) {
                    if (!i.deferred && !i.replied) return await i.reply({ content: "Action réservée aux modérateurs.", ephemeral: true }).catch(() => {});
                    return;
                }

                if (i.customId === "ticket_staff_thread") {
                    if (!i.deferred && !i.replied) await i.deferReply({ ephemeral: true }).catch(() => {});
                    try {
                        const thread = await i.channel.threads.create({
                            name: `🔒-discussion-staff-${i.channel.name}`,
                            autoArchiveDuration: 1440,
                            type: ChannelType.PrivateThread
                        });
                        await thread.send({ content: `🔒 **Fil Privé réservé au Staff.**\nDiscutez ici du cas sans notifier l'utilisateur.` });
                        return await i.editReply({ content: `Fil staff privé créé : ${thread}` }).catch(() => {});
                    } catch (e) {
                        return await i.editReply({ content: "Impossible de créer le fil privé (vérifiez les permissions du bot)." }).catch(() => {});
                    }
                }

                if (i.customId === "ticket_add_user" || i.customId === "ticket_remove_user") {
                    const modal = new ModalBuilder().setCustomId(`modal_user_${i.customId}`).setTitle("Gestion des permissions");
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("user_id").setLabel("ID Unique du membre").setStyle(TextInputStyle.Short).setRequired(true)));
                    return await i.showModal(modal).catch(() => {});
                }

                if (i.customId === "ticket_create_voice") {
                    if (!i.deferred && !i.replied) await i.deferReply({ ephemeral: true }).catch(() => {});
                    const voiceChannel = await i.guild.channels.create({ 
                        name: `Entretien-${i.channel.name.split("-")[1] || ""}`, 
                        type: ChannelType.GuildVoice, 
                        parent: i.channel.parentId, 
                        permissionOverwrites: i.channel.permissionOverwrites.cache.map(p => p) 
                    }).catch(() => null);

                    if (!voiceChannel) return await i.editReply({ content: "Erreur lors de la création du salon vocal." }).catch(() => {});
                    return await i.editReply({ content: `Salon d'entretien vocal éphémère créé : ${voiceChannel}` }).catch(() => {});
                }
            }

            // MODALS MODERATION
            if (i.isModalSubmit() && i.customId.startsWith("modal_user_")) {
                if (!i.deferred && !i.replied) await i.deferReply({ ephemeral: true }).catch(() => {});
                const actionType = i.customId.includes("add") ? "add" : "remove";
                const targetId = i.fields.getTextInputValue("user_id");
                const targetMember = await i.guild.members.fetch(targetId).catch(() => null);

                if (!targetMember) return await i.editReply({ content: "Cet identifiant n'appartient pas à ce serveur." }).catch(() => {});

                if (actionType === "add") {
                    await i.channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
                    await i.channel.send({ content: `${targetMember} a été ajouté à cet espace privé.` }).catch(() => {});
                } else {
                    await i.channel.permissionOverwrites.delete(targetMember.id).catch(() => {});
                    await i.channel.send({ content: `${targetMember} a été retiré de cet espace.` }).catch(() => {});
                }
                return await i.editReply({ content: "Permissions mises à jour avec succès." }).catch(() => {});
            }

            // FERMETURE & ACTIONS PRINCIPALES
            if (i.isButton() && ["claim", "close", "delete", "force_close_confirm", "cancel_close", "blacklist_user"].includes(i.customId)) {
      