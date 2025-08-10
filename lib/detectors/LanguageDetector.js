class LanguageDetector {
    constructor(client, options = {}, debug = false) {
        this.client = client;
        this.languageSource = options.languageSource || 'getUserVar[language;{userId}]';
        this.guildLanguageSource = options.guildLanguageSource || 'getServerVar[language;{guildId}]';
        this.customLanguageFunction = options.customLanguageFunction || null;
        this.fallbackToGuildLanguage = options.fallbackToGuildLanguage !== false;
        this.debug = debug;
    }

    /**
     * Detects user's preferred language from various sources
     * @param {Object} d - aoi.js data object
     * @param {Object} locales - Available locales instance
     * @returns {Promise<string|null>} Detected language or null
     */
    async detectUserLanguage(d, locales) {
        try {
            if (this.debug) {
                console.log(`[aoi.locale] Starting language detection for user: ${d.author?.id}`);
            }
            
            if (this.customLanguageFunction && typeof this.customLanguageFunction === 'function') {
                if (this.debug) {
                    console.log(`[aoi.locale] Trying custom language function...`);
                }
                const customLang = this.customLanguageFunction(d);
                if (customLang && locales.hasLocale(customLang)) {
                    if (this.debug) {
                        console.log(`[aoi.locale] Custom function returned: ${customLang}`);
                    }
                    return customLang;
                }
                if (this.debug) {
                    console.log(`[aoi.locale] Custom function returned: ${customLang} (not valid or null)`);
                }
            }

            if (this.languageSource) {
                if (this.debug) {
                    console.log(`[aoi.locale] Trying user language source: ${this.languageSource}`);
                }
                const userLang = await this.executeLanguageSource(this.languageSource, d);
                if (this.debug) {
                    console.log(`[aoi.locale] User language source returned: ${userLang}`);
                }
                if (userLang && locales.hasLocale(userLang)) {
                    if (this.debug) {
                        console.log(`[aoi.locale] ✅ Using user language: ${userLang}`);
                    }
                    return userLang;
                }
                if (this.debug) {
                    console.log(`[aoi.locale] User language not valid or not found in locales`);
                }
            }

            if (this.fallbackToGuildLanguage && this.guildLanguageSource) {
                if (this.debug) {
                    console.log(`[aoi.locale] Trying guild language source: ${this.guildLanguageSource}`);
                }
                const guildLang = await this.executeLanguageSource(this.guildLanguageSource, d);
                if (this.debug) {
                    console.log(`[aoi.locale] Guild language source returned: ${guildLang}`);
                }
                if (guildLang && locales.hasLocale(guildLang)) {
                    if (this.debug) {
                        console.log(`[aoi.locale] ✅ Using guild language: ${guildLang}`);
                    }
                    return guildLang;
                }
                if (this.debug) {
                    console.log(`[aoi.locale] Guild language not valid or not found in locales`);
                }
            }

            if (this.debug) {
                console.log(`[aoi.locale] ❌ No language detected, will use first available: ${locales.getFirstAvailableLocale()}`);
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
