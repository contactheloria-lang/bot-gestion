// modules/autoMod.js
const EMOJI_REGEX = /(<a?:[a-zA-Z0-9_]+:[0-9]+>|\p{Extended_Pictographic})/gu;

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild || message.system) return;

        const containsSticker = message.stickers.size > 0;
        const containsEmoji = EMOJI_REGEX.test(message.content);

        if (containsSticker || containsEmoji) {
            try {
                await message.delete();

                const warningMsg = await message.channel.send({
                    content: `⚠️ **Attention ${message.author} !**\n\n` +
                             `*Les émojis et autocollants sont **strictement interdits** dans les messages textuels.*\n` +
                             `> ||Les réactions sous les annonces restent autorisées.||\n\n` +
                             `Merci de respecter les règles du serveur.`
                });

                setTimeout(() => {
                    warningMsg.delete().catch(() => {});
                }, 6000);

            } catch (error) {
                console.error(`❌ [AUTOMOD ERROR] Impossible de supprimer le message dans #${message.channel.name} :`, error.message);
            }
        }
    });
};
