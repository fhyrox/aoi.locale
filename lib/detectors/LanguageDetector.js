class LanguageDetector {
    constructor(client, options = {}) {
        this.client = client;
        this.languageSource = options.languageSource || 'getUserVar[language;{userId}]';
        this.guildLanguageSource = options.guildLanguageSource || 'getServerVar[language;{guildId}]';
        this.customLanguageFunction = options.customLanguageFunction || null;
        this.fallbackToGuildLanguage = options.fallbackToGuildLanguage !== false;
    }

    /**
     * Detects user's preferred language from various sources
     * @param {Object} d - aoi.js data object
     * @param {Object} locales - Available locales instance
     * @returns {Promise<string|null>} Detected language or null
     */
    async detectUserLanguage(d, locales) {
        try {
            if (this.customLanguageFunction && typeof this.customLanguageFunction === 'function') {
                const customLang = this.customLanguageFunction(d);
                if (customLang && locales.hasLocale(customLang)) {
                    return customLang;
                }
            }

            if (this.languageSource) {
                const userLang = await this.executeLanguageSource(this.languageSource, d);
                if (userLang && locales.hasLocale(userLang)) {
                    return userLang;
                }
            }

            if (this.fallbackToGuildLanguage && this.guildLanguageSource) {
                const guildLang = await this.executeLanguageSource(this.guildLanguageSource, d);
                if (guildLang && locales.hasLocale(guildLang)) {
                    return guildLang;
                }
            }

            return null;
        } catch (error) {
            console.warn(`[aoi.locale] Error detecting user language: ${error.message}`);
            return null;
        }
    }

    /**
     * Executes language source command using aoi.js interpreter
     * @param {string} source - Source command template
     * @param {Object} d - aoi.js data object
     * @returns {Promise<string|null>} Language code or null
     */
    async executeLanguageSource(source, d) {
        try {
            const userId = d.author?.id || d.data?.author?.id || '';
            const guildId = d.guild?.id || d.data?.guild?.id || '';
            
            let command = source
                .replace(/\{userId\}/g, userId)
                .replace(/\{guildId\}/g, guildId)
                .replace(/\{channelId\}/g, d.channel?.id || '');

            try {
                const Interpreter = require('aoi.js/src/core/interpreter');
                
                const mockMessage = {
                    author: d.author || { id: userId },
                    guild: d.guild || { id: guildId },
                    channel: d.channel || { id: d.channel?.id },
                    member: d.member || null,
                    mentions: d.mentions || { users: new Map(), roles: new Map(), channels: new Map() },
                    message: d.message || d
                };

                const commandObj = {
                    name: 'temp_locale_getter',
                    code: command,
                    type: 'basic'
                };

                const result = await Interpreter(
                    this.client,
                    mockMessage,
                    [],
                    commandObj,
                    null,
                    true,
                    null,
                    {},
                    null,
                    false,
                    false,
                    false,
                    false
                );

                if (result && result.code) {
                    let value = result.code;
                    value = value.replace(/\{[^}]*\}/g, '');
                    value = value.trim();
                    
                    if (value !== command && value && value !== 'undefined' && value !== 'null' && value !== '' && value !== ' ') {
                        return value;
                    }
                }

            } catch (interpreterError) {
                if (command.includes('getUserVar[')) {
                    const match = command.match(/getUserVar\[([^;]+);([^\]]+)\]/);
                    if (match) {
                        const varName = match[1];
                        const targetUserId = match[2];
                        
                        if (this.client.db && this.client.db.tables) {
                            const table = this.client.db.tables.find(t => t.name === '__aoijs_vars__');
                            if (table && table.all) {
                                try {
                                    const dbResult = table.all(`SELECT value FROM \`${varName}\` WHERE userID = ?`, [targetUserId]);
                                    if (dbResult && dbResult.length > 0 && dbResult[0].value) {
                                        return dbResult[0].value;
                                    }
                                } catch (dbError) {
                                    console.error(`[aoi.locale] Fallback DB error: ${dbError.message}`);
                                }
                            }
                        }
                    }
                }

                if (command.includes('getServerVar[')) {
                    const match = command.match(/getServerVar\[([^;]+);([^\]]+)\]/);
                    if (match) {
                        const varName = match[1];
                        const targetGuildId = match[2];
                        
                        if (this.client.db && this.client.db.tables) {
                            const table = this.client.db.tables.find(t => t.name === 'main');
                            if (table && table.all) {
                                try {
                                    const dbResult = table.all(`SELECT value FROM \`${varName}\` WHERE guildID = ?`, [targetGuildId]);
                                    if (dbResult && dbResult.length > 0 && dbResult[0].value) {
                                        return dbResult[0].value;
                                    }
                                } catch (dbError) {
                                    console.error(`[aoi.locale] Fallback server DB error: ${dbError.message}`);
                                }
                            }
                        }
                    }
                }
            }

            return null;

        } catch (error) {
            console.warn(`[aoi.locale] Error executing language source: ${error.message}`);
            return null;
        }
    }
}

module.exports = LanguageDetector;
