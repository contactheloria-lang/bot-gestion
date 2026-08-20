// modules/autoMod.js
const EMOJI_REGEX = /(<a?:[a-zA-Z0-9_]+:[0-9]+>|\p{Extended_Pictographic})/gu;

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        // Ignorer les bots, les MP et les messages système
        if (message.author.bot || !message.guild || message.system) return;

        const containsSticker = message.stickers.size > 0;
        const containsEmoji = EMOJI_REGEX.test(message.content);

        if (containsSticker || containsEmoji) {
            try {
                // Suppression immédiate du message non autorisé
                await message.delete();

                // Notification d'avertissement temporaire en MP ou dans le salon
                const warningMsg = await message.channel.send({
                    content: `⚠️ **Attention ${message.author} !**\n\n` +
                             `*Les émojis et autocollants sont **interdits** dans les messages du serveur.*\n` +
                             `> ||Seules les réactions sous les annonces sont autorisées.||\n\n` +
                             `Merci de respecter les consignes.`
                });

                // Auto-suppression du message d'avertissement après 6 secondes
                setTimeout(() => {
                    warningMsg.delete().catch(() => {});
                }, 6000);

            } catch (error) {
                // Gestion des erreurs de permissions (ex: manque le droit de supprimer les messages)
                console.error(`[AutoMod Error] Impossible de gérer le message dans #${message.channel.name}:`, error.message);
            }
        }
    });
};
