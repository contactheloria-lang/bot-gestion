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

const config = require("../data/ticket_database.js");

const LOGS_CHANNEL = "1535305443847577811";
const ARCHIVE_CHANNEL = "1535305532620148736";
const AVIS_CHANNEL = "1535305562714148935"; 

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

    // 1. PANNEAU PRINCIPAL
    try {
        if (config?.PANEL_CHANNEL) {
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
        }
    } catch (e) {
        console.error("[PANEL INIT ERROR] :", e);
    }

    // 2. COMMANDES STAFF
    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild) return;

        const db = readDB();
        if (db.tickets[message.channel.id]) {
            db.tickets[message.channel.id].lastActivity = Date.now();
            db.tickets[message.channel.id].messageCount = (db.tickets[message.channel.id].messageCount || 0) + 1;
            writeDB(db);
        }

        if (message.content.startsWith("+test modérateur")) {
            const allowedRoles = config?.ROLES?.staff || [];
            const isStaff = message.member.roles.cache.some(r => allowedRoles.includes(r.id)) || message.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            if (!isStaff) return message.reply("Action réservée à la direction.").catch(() => {});

            const targetUser = message.mentions.members.first();
            if (!targetUser) return message.reply("Veuillez mentionner le modérateur en test.").catch(() => {});

            if (config?.TEST_MODO_ROLE) {
                await targetUser.roles.add(config.TEST_MODO_ROLE).catch(() => {});
            }
            await message.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});

            return message.reply({ embeds: [new EmbedBuilder().setColor("#FFFFFF").setTitle("ÉVALUATION STAFF").setDescription(`Bienvenue ${targetUser} dans votre salon de test.`)] }).catch(() => {});
        }

        if (message.content.startsWith("+unblacklist")) {
            const isStaff = message.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            if (!isStaff) return message.reply("Permission insuffisante.").catch(() => {});

            const args = message.content.split(" ");
            const targetId = args[1];
            if (!targetId) return message.reply("Veuillez indiquer l'ID de l'utilisateur. Ex: `+unblacklist 123456789`").catch(() => {});

            if (!db.blacklist.includes(targetId)) {
                return message.reply("Cet utilisateur n'est pas dans la liste noire.").catch(() => {});
            }

            db.blacklist = db.blacklist.filter(id => id !== targetId);
            writeDB(db);
            return message.reply(`✅ L'utilisateur <@${targetId}> (\`${targetId}\`) a été débanni du système de support.`).catch(() => {});
        }

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

    // 3. INTERACTIONS
    client.on("interactionCreate", async (i) => {
        try {
            // AVIS EN MP
            if (!i.guild) {
                const db = readDB();

                if (i.isButton() && i.customId.startsWith("rate_")) {
                    const parts = i.customId.split("_");
                    const stars = parts[1];
                    const staffId = parts[2] || "none";

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
                    const stars = parseInt(parts[2]) || 5;
                    const staffId = parts[3] !== "none" ? parts[3] : "Non assigné";

                    const reviewEmbed = new EmbedBuilder()
                        .setColor("#FFFFFF")
                        .setTitle("Nouvel Avis Support — Team HeLoRiA")
                        .addFields(
                            { name: "Staff Évalué", value: staffId !== "Non assigné" ? `<@${staffId}> (\`${staffId}\`)` : "Aucun", inline: true },
                            { name: "Note globale", value: `${stars}/5`, inline: true },
                            { name: "Auteur", value: `${i.user} (\`${i.user.id}\`)`, inline: false },
                            { name: "Commentaire", value: i.fields.getTextInputValue("comment") }
                        )
                        .setTimestamp();

                    if (staffId !== "Non assigné") {
                        if (!db.stats[staffId]) db.stats[staffId] = { closedTickets: 0, reviews: [] };
                        db.stats[staffId].reviews.push(stars);
                        writeDB(db);
                    }

                    const guildInstance = client.guilds.cache.first();
                    if (guildInstance) {
                        const reviewLogs = await guildInstance.channels.fetch(AVIS_CHANNEL).catch(() => null);
                        if (reviewLogs) await reviewLogs.send({ embeds: [reviewEmbed] }).catch(() => {});
                    }

                    return await i.editReply({ content: "Merci ! Votre évaluation a été transmise à l'équipe Team HeLoRiA." }).catch(() => {});
                }
                return;
            }

            // ANTI-SPAM
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

            // OUVERTURE TICKET
            if (i.isStringSelectMenu() && i.customId === "ticket_select") {
                if (!i.deferred && !i.replied) await i.deferReply({ ephemeral: true }).catch(() => {});

                const db = readDB();
                const type = i.values[0];

                if (db.blacklist.includes(i.user.id)) {
                    return await i.editReply({ content: "Vous êtes banni du système de support." }).catch(() => {});
                }

                try {
                    const categoryId = config?.CATEGORIES ? config.CATEGORIES[type] : null;
                    const basePermissions = [
                        { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                    ];

                    ((config?.ROLES ? config.ROLES[type] : []) || []).forEach(rId => {
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
                ? ((config?.ROLES ? config.ROLES[context.type] : []) || []).some(rId => i.member.roles.cache.has(rId)) || i.member.permissions.has(PermissionsBitField.Flags.ManageChannels) 
                : i.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

            // FIL PRIVE STAFF & UTILS
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
                if (!isStaffUser && !["cancel_close"].includes(i.customId)) {
                    if (!i.deferred && !i.replied) return await i.reply({ content: "Action refusée. Droits de modération requis.", ephemeral: true }).catch(() => {});
                    return;
                }

                if (i.customId === "blacklist_user") {
                    if (!context) {
                        if (!i.deferred && !i.replied) return await i.reply({ content: "Impossible de cibler l'auteur.", ephemeral: true }).catch(() => {});
                        return;
                    }
                    if (!i.deferred && !i.replied) await i.reply({ content: "Application de la blacklist...", ephemeral: true }).catch(() => {});

                    if (!db.blacklist.includes(context.userId)) {
                        db.blacklist.push(context.userId);
                    }
                    delete db.tickets[i.channel.id];
                    writeDB(db);

                    const logChannel = await i.guild.channels.fetch(LOGS_CHANNEL).catch(() => null);
                    if (logChannel) {
                        logChannel.send({ embeds: [new EmbedBuilder().setColor("#FFFFFF").setTitle("BLACKLIST SUPPORT").setDescription(`L'ID \`${context.userId}\` a été banni du système de support par ${i.user}.`)] }).catch(() => {});
                    }

                    setTimeout(() => i.channel.delete().catch(() => {}), 2000);
                    return;
                }

                if (i.customId === "claim") {
                    if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
                    if (db.tickets[i.channel.id]) {
                        db.tickets[i.channel.id].claimedBy = i.user.id; 
                        writeDB(db);
                    }

                    await i.channel.setName(`prise-en-charge-${i.channel.name}`).catch(() => {});

                    const updatedRow = ActionRowBuilder.from(i.message.components[0]);
                    updatedRow.components[0] = new ButtonBuilder()
                        .setCustomId("claimed")
                        .setLabel(`Pris en charge par ${i.user.username}`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true);

                    await i.message.edit({ components: [updatedRow, i.message.components[1]] }).catch(() => {});
                    return await i.channel.send({ embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription(`**${i.user.username}** a pris en charge votre demande.`)] }).catch(() => {});
                }

                if (i.customId === "close") {
                    if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
                    const confirmEmbed = new EmbedBuilder().setColor("#FFFFFF").setDescription("Voulez-vous fermer ce ticket définitivement ? Un transcript sera généré.");
                    const confirmRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("force_close_confirm").setLabel("Confirmer la fermeture").setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId("cancel_close").setLabel("Annuler").setStyle(ButtonStyle.Secondary)
                    );
                    return await i.channel.send({ embeds: [confirmEmbed], components: [confirmRow] }).catch(() => {});
                }

                if (i.customId === "cancel_close") {
                    if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
                    await i.message.delete().catch(() => {});
                    return await i.channel.send("Fermeture annulée.").catch(() => {});
                }

                if (i.customId === "force_close_confirm" || i.customId === "delete") {
                    if (!i.deferred && !i.replied) await i.reply({ content: "Génération du transcript et suppression...", ephemeral: true }).catch(() => {});
                    return await generateSystemClose(i.channel, client, context, i.user);
                }
            }
        } catch (globalErr) {
            console.error("❌ Erreur globale d'interaction dans ticketSystem :", globalErr);
        }
    });
};

async function generateSystemClose(channel, client, context, closedBy) {
    try {
        const guild = channel.guild;
        const archiveChan = await guild.channels.fetch(ARCHIVE_CHANNEL).catch(() => null);

        if (archiveChan) {
            const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
            let transcriptText = `--- TRANSCRIPT TICKET : ${channel.name} ---\n\n`;

            if (messages) {
                messages.reverse().forEach(m => {
                    transcriptText += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
                });
            }

            const buffer = Buffer.from(transcriptText, "utf-8");
            const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

            await archiveChan.send({
                content: `📁 **Transcript généré** pour le salon \`${channel.name}\` (Fermé par ${closedBy})`,
                files: [attachment]
            }).catch(() => {});
        }

        const db = readDB();
        delete db.tickets[channel.id];
        writeDB(db);

        setTimeout(() => {
            channel.delete().catch(() => {});
        }, 2000);
    } catch (err) {
        console.error("❌ Erreur lors de la fermeture du ticket :", err);
        channel.delete().catch(() => {});
    }
}

function getFormEmbed(type) {
    const embed = new EmbedBuilder().setColor("#FFFFFF").setTimestamp();

    if (type === "joueur") {
        return embed.setTitle("Recrutement Joueur — Team HeLoRiA")
            .setDescription("> Merci de répondre précisément aux questions ci-dessous.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Informations générales\n・Pseudo Epic Games :\n・Âge :\n・Plateforme :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Parcours compétitif\n・Power Ranking (PR) :\n・Anciennes structures :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Motivation\n・Vos ambitions :\n・Pourquoi rejoindre la Team HeLoRiA ?\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Merci pour votre candidature.");
    } else if (type === "staff") {
        return embed.setTitle("Recrutement Staff — Team HeLoRiA")
            .setDescription("> Merci de répondre précisément aux questions ci-dessous.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Informations générales\n・Pseudo Discord :\n・Âge :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Expérience & Motivation\n・Vos anciennes expériences :\n・Pourquoi la Team HeLoRiA ?\n・Vos compétences en modération :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Merci pour votre candidature.");
    } else if (type === "audiovisuel") {
        return embed.setTitle("Recrutement Audiovisuel — Team HeLoRiA")
            .setDescription("> Merci de présenter votre portfolio ou vos réalisations ci-dessous.\n\n" +
                "・Domaine (GFX, VFX, Monteur, Caster, Streamer) :\n" +
                "・Lien vers votre portfolio / chaîne :\n" +
                "・Logiciels utilisés :\n" +
                "・Vos motivations :");
    } else if (type === "partenariat") {
        return embed.setTitle("Demande de Partenariat — Team HeLoRiA")
            .setDescription("> Présentez votre projet ou votre serveur ci-dessous.\n\n" +
                "・Nom du projet / serveur :\n" +
                "・Lien permanent / Réseaux :\n" +
                "・Nombre de membres :\n" +
                "・Type de partenariat souhaité :");
    } else {
        return embed.setTitle("Assistance Générale — Team HeLoRiA")
            .setDescription("> Veuillez décrire votre problème ou votre question le plus précisément possible afin qu'un modérateur puisse vous aider.");
    }
}
