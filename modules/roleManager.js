const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    PermissionsBitField 
} = require("discord.js");
const config = require("../data/rolesConfig");

// Palette de couleurs monochrome
const COLOR_WHITE = "#FFFFFF";
const COLOR_BLACK = "#000001"; // Code hexadécimal noir pour éviter le rendu par défaut de Discord

module.exports = (client) => {
    console.log("[ROLE SYSTEM] Module d'auto-rôle Team HeLoRiA prêt.");

    client.on("messageCreate", async (msg) => {
        if (!msg.guild || msg.author.bot) return;

        if (msg.content === "+setup-roles") {
            try {
                if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return msg.reply("Seuls les administrateurs peuvent exécuter cette commande.");
                }

                await msg.delete().catch(() => {});

                // Nettoyage automatique des anciens messages du bot dans le salon
                const channelMessages = await msg.channel.messages.fetch({ limit: 20 }).catch(() => null);
                if (channelMessages) {
                    const oldBotMessages = channelMessages.filter(m => m.author.id === client.user.id);
                    for (const oldMsg of oldBotMessages.values()) {
                        await oldMsg.delete().catch(() => {});
                    }
                }

                // =====================================================
                // 1. EMBED HEADER PRINCIPAL
                // =====================================================
                const headerEmbed = new EmbedBuilder()
                    .setColor(COLOR_WHITE)
                    .setTitle("TEAM HELORIA — CONFIGURATION DU PROFIL")
                    .setDescription(
                        "Bienvenue dans l'espace de personnalisation de votre profil.\n" +
                        "Sélectionnez vos options ci-dessous afin de définir vos rôles et vos préférences d'affichage sur le serveur.\n\n" +
                        "───\n\n" +
                        "• Cliquez sur une option pour attribuer ou retirer le rôle correspondant.\n" +
                        "• Toute modification est instantanée et enregistrée automatiquement."
                    );

                // =====================================================
                // 2. EMBED & MENU : IDENTITÉ
                // =====================================================
                const embedGenre = new EmbedBuilder()
                    .setColor(COLOR_BLACK)
                    .setTitle("1. IDENTITÉ & GENRE")
                    .setDescription("Définissez le genre associé à votre profil membre.");

                const menuGenre = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("role_select_genre")
                        .setPlaceholder("Sélectionner votre genre...")
                        .addOptions([
                            { label: "Homme", value: "HOMME", description: "Définir le profil : Homme" },
                            { label: "Femme", value: "FEMME", description: "Définir le profil : Femme" },
                            { label: "Non précisé", value: "NON_PRECISE", description: "Retirer l'affichage du genre" }
                        ])
                );

                // =====================================================
                // 3. EMBED & MENU : PLATEFORME
                // =====================================================
                const embedPlateforme = new EmbedBuilder()
                    .setColor(COLOR_WHITE)
                    .setTitle("2. SUPPORT & PLATEFORME DE JEU")
                    .setDescription("Indiquez le support principal sur lequel vous évoluez.");

                const menuPlateforme = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("role_select_plateforme")
                        .setPlaceholder("Sélectionner votre plateforme...")
                        .addOptions([
                            { label: "PC", value: "PC", description: "Joueur PC (Windows / Mac / Linux)" },
                            { label: "PlayStation", value: "PLAYSTATION", description: "Joueur Console PlayStation" },
                            { label: "Xbox", value: "XBOX", description: "Joueur Console Xbox" },
                            { label: "Nintendo Switch", value: "SWITCH", description: "Joueur Console Nintendo Switch" }
                        ])
                );

                // =====================================================
                // 4. EMBED & MENU : NOTIFICATIONS
                // =====================================================
                const embedNotifs = new EmbedBuilder()
                    .setColor(COLOR_BLACK)
                    .setTitle("3. PREFÉRENCES DE NOTIFICATIONS")
                    .setDescription("Sélectionnez les alertes et mentions que vous souhaitez recevoir sur le serveur.");

                const menuNotifs = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("role_select_notifs")
                        .setPlaceholder("Sélectionner vos alertes...")
                        .setMinValues(0)
                        .setMaxValues(6)
                        .addOptions([
                            { label: "Annonces Officielle", value: "ANNONCES", description: "Alertes sur les décisions et nouveautés" },
                            { label: "Animations & Events", value: "ANIMATIONS", description: "Alertes événements, tournois et mini-jeux" },
                            { label: "Sondages", value: "SONDAGES", description: "Alertes consultations et votes communautaires" },
                            { label: "Web TV & Streams", value: "WEBTV", description: "Alertes direct et diffusions de la structure" },
                            { label: "Actualités Réseaux", value: "RESEAUX", description: "Nouveautés publiées sur nos réseaux sociaux" },
                            { label: "Partenariats", value: "PARTENAIRES", description: "Offres et annonces de nos partenaires" }
                        ])
                );

                // =====================================================
                // 5. EMBED & MENU : COMPETITION
                // =====================================================
                const embedDivision = new EmbedBuilder()
                    .setColor(COLOR_WHITE)
                    .setTitle("4. NIVEAU COMPÉTITIF — FORTNITE")
                    .setDescription(
                        "Affichez votre division compétitive actuelle.\n\n" +
                        "Note : L'obtention de la Division 1 requiert une vérification manuelle par un membre du Staff."
                    )
                    .setFooter({ text: "Team HeLoRiA • Système de Profil Officiel" });

                const menuDivision = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("role_select_division")
                        .setPlaceholder("Sélectionner votre division...")
                        .addOptions([
                            { label: "Division 1 (Vérification Staff Reconstitution)", value: "DIV_1", description: "Niveau Élite • Requiert une validation" },
                            { label: "Division 2", value: "DIV_2", description: "Niveau Avancé" },
                            { label: "Division 3", value: "DIV_3", description: "Niveau Intermédiaire" },
                            { label: "Division 4", value: "DIV_4", description: "Niveau Challenger" },
                            { label: "Division 5", value: "DIV_5", description: "Niveau Débutant / Casual" }
                        ])
                );

                // Envoi successif des blocs d'embeds
                await msg.channel.send({ embeds: [headerEmbed] });
                await msg.channel.send({ embeds: [embedGenre], components: [menuGenre] });
                await msg.channel.send({ embeds: [embedPlateforme], components: [menuPlateforme] });
                await msg.channel.send({ embeds: [embedNotifs], components: [menuNotifs] });
                await msg.channel.send({ embeds: [embedDivision], components: [menuDivision] });

            } catch (error) {
                console.error("Erreur lors de l'initialisation du panneau de rôles :", error);
            }
        }
    });

    // =====================================================
    // GESTION DES INTERACTIONS
    // =====================================================
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isStringSelectMenu()) return;
        if (!interaction.customId.startsWith("role_select_")) return;

        try {
            await interaction.deferReply({ ephemeral: true });

            const member = interaction.member;
            const selectedValue = interaction.values[0];

            // Helper pour réponse sous forme d'embed éphémère élégant
            const sendResponseEmbed = async (title, statusText, isWhite = true) => {
                const responseEmbed = new EmbedBuilder()
                    .setColor(isWhite ? COLOR_WHITE : COLOR_BLACK)
                    .setTitle(title)
                    .setDescription(statusText)
                    .setFooter({ text: "Team HeLoRiA • Mise à jour du profil" })
                    .setTimestamp();

                return interaction.editReply({ embeds: [responseEmbed] });
            };

            // 1. GENRE
            if (interaction.customId === "role_select_genre") {
                const roleId = config.ROLES_GENRE[selectedValue];
                if (!roleId || roleId.startsWith("ID_")) {
                    return sendResponseEmbed("Configuration Incomplète", "Ce rôle n'a pas encore été configuré dans le système.", false);
                }

                for (const key in config.ROLES_GENRE) {
                    const id = config.ROLES_GENRE[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                await member.roles.add(roleId).catch(() => {});
                return sendResponseEmbed("Profil mis à jour", "Votre choix d'identité a bien été enregistré.", true);
            }

            // 2. PLATEFORME
            if (interaction.customId === "role_select_plateforme") {
                const roleId = config.ROLES_PLATEFORME[selectedValue];
                if (!roleId || roleId.startsWith("ID_")) {
                    return sendResponseEmbed("Configuration Incomplète", "Ce rôle n'a pas encore été configuré dans le système.", false);
                }

                for (const key in config.ROLES_PLATEFORME) {
                    const id = config.ROLES_PLATEFORME[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                await member.roles.add(roleId).catch(() => {});
                return sendResponseEmbed("Profil mis à jour", "Votre plateforme de jeu a été attribuée avec succès.", true);
            }

            // 3. NOTIFICATIONS
            if (interaction.customId === "role_select_notifs") {
                const selectedValues = interaction.values;
                
                for (const key in config.ROLES_NOTIFS) {
                    const roleId = config.ROLES_NOTIFS[key];
                    if (!roleId || roleId.startsWith("ID_")) continue;

                    if (selectedValues.includes(key)) {
                        if (!member.roles.cache.has(roleId)) await member.roles.add(roleId).catch(() => {});
                    } else {
                        if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(() => {});
                    }
                }

                return sendResponseEmbed("Préférences mises à jour", "Vos abonnements de notifications ont été modifiés.", true);
            }

            // 4. DIVISION FORTNITE
            if (interaction.customId === "role_select_division") {
                const roleId = config.ROLES_DIVISION[selectedValue];
                if (!roleId || roleId.startsWith("ID_")) {
                    return sendResponseEmbed("Configuration Incomplète", "Ce rôle n'a pas encore été configuré dans le système.", false);
                }

                if (selectedValue === "DIV_1") {
                    return sendResponseEmbed(
                        "Vérification Requise — Division 1", 
                        "L'accès au rôle **Division 1** nécessite une validation par le Staff.\n\nVeuillez ouvrir un ticket pour transmettre vos preuves de rang au Staff Team HeLoRiA.",
                        false
                    );
                }

                for (const key in config.ROLES_DIVISION) {
                    const id = config.ROLES_DIVISION[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                await member.roles.add(roleId).catch(() => {});
                return sendResponseEmbed("Profil mis à jour", "Votre division compétitive a été enregistrée.", true);
            }
        } catch (error) {
            console.error("Erreur lors de la gestion de l'interaction des rôles :", error);
        }
    });
};