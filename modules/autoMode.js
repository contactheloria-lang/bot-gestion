// modules/autoMode.js
const EMOJI_REGEX = /(<a?:[a-zA-Z0-9_]+:[0-9]+>|\p{Extended_Pictographic})/u;

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        // Ignore les bots, les MP et les messages système
        if (message.author.bot || !message.guild || message.system) return;

        const containsSticker = message.stickers && message.stickers.size > 0;
        const containsEmoji = EMOJI_REGEX.test(message.content);

        if (containsSticker || containsEmoji) {
            try {
                // Vérifie que le bot a les permissions de supprimer
                if (message.deletable) {
                    await message.delete();
                }

                const warningMsg = await message.channel.send({
                    content: `⚠️ **Attention ${message.author} !**\n\n` +
                             `*Les émojis et autocollants sont **strictement interdits** dans les messages textuels.*\n` +
                             `> ||Les réactions sous les annonces restent autorisées.||\n\n` +
                             `Merci de respecter les règles du serveur.`
                });

                // Suppression automatique du message d'avertissement après 6 secondes
                setTimeout(() => {
                    warningMsg.delete().catch(() => {});
                }, 6000);

            } catch (error) {
                console.error(`❌ [AUTOMOD ERROR] Impossible de gérer le message dans #${message.channel.name} :`, error.message);
            }
        }
    });
};
