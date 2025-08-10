const { AoiFunction } = require('aoi.js');
const fs = require('fs');
const path = require('path');

class AoiLocale {
    constructor() {
        this.locales = new Map();
        this.localeDir = './locales';
    }

    /**
     * Integrates the module with aoi.js bot
     * @param {AoiClient} client - aoi.js bot client
     * @param {Object} options - Configuration options
     */
    init(client, options = {}) {
        this.client = client;
        this.localeDir = options.localeDir || './locales';
        
        this.autoLanguage = true; 
        this.languageSource = options.languageSource || 'getUserVar[language;{userId}]';
        this.guildLanguageSource = options.guildLanguageSource || 'getServerVar[language;{guildId}]';
        this.customLanguageFunction = options.customLanguageFunction || null;
        this.fallbackToGuildLanguage = options.fallbackToGuildLanguage !== false; 

        this.loadLocales();
        this.addLocaleFunction();

        return this;
    }

    /**
     * Loads all language files from the locale directory
     */
    loadLocales() {
        try {
            if (!fs.existsSync(this.localeDir)) {
                fs.mkdirSync(this.localeDir, { recursive: true });
            }

            const files = fs.readdirSync(this.localeDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            for (const file of jsonFiles) {
                const locale = path.basename(file, '.json');
                const filePath = path.join(this.localeDir, file);
                
                try {
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.locales.set(locale, data);
                } catch (error) {
                    console.error(`[aoi.locale] Error loading ${file}: ${error.message}`);
                }
            }

            if (this.locales.size === 0) {
                console.warn('[aoi.locale] No locale files found. Creating example files...');
                this.createExampleLocales();
            }
        } catch (error) {
            console.error(`[aoi.locale] Error loading locale files: ${error.message}`);
        }
    }

    /**
     * Creates example locale files
     */
    createExampleLocales() {
        const examples = {
            'en.json': {
                "welcome": "Welcome to our server!",
                "goodbye": "Goodbye, see you later!",
                "hello": "Hello {user}!",
                "error": "An error occurred!",
                "success": "Operation completed successfully!"
            },
            'tr.json': {
                "welcome": "Sunucumuza hoş geldiniz!",
                "goodbye": "Hoşçakal, sonra görüşürüz!",
                "hello": "Merhaba {user}!",
                "error": "Bir hata oluştu!",
                "success": "İşlem başarıyla tamamlandı!"
            }
        };

        for (const [filename, content] of Object.entries(examples)) {
            const filePath = path.join(this.localeDir, filename);
            fs.writeFileSync(filePath, JSON.stringify(content, null, 4));
            const locale = path.basename(filename, '.json');
            this.locales.set(locale, content);
        }
    }

    /**
     * Adds the $locale function to aoi.js
     */
    addLocaleFunction() {
        const localeInstance = this;

        this.client.functionManager.createFunction({
            name: '$locale',
            type: 'djs',
            code: async (d) => {
                const data = d.util.aoiFunc(d);
                
                if (data.err) return d.error(data.err);

                const [key, ...args] = data.inside.splits;

                if (!key || key.trim() === '') {
                    return d.aoiError.fnError(d, 'custom', {}, 'Key not specified in $locale function');
                }

                const trimmedKey = key.trim();
                let locale = null;
                let params = {};
                let forceLocale = false;
                
                for (const arg of args) {
                    if (!arg) continue;
                    
                    const trimmedArg = arg.trim();
                    
                    if (trimmedArg.includes(':')) {
                        const [paramKey, paramValue] = trimmedArg.split(':', 2);
                        if (paramKey && paramValue) {
                            params[paramKey.trim()] = paramValue.trim();
                        }
                    } 
                    else if (trimmedArg.includes('|')) {
                        const [langParam, defaultLang] = trimmedArg.split('|', 2);
                        locale = langParam.replace('?', '').trim() || defaultLang.trim();
                        forceLocale = true;
                    }
                    else if (/^[a-z]{2,3}$/i.test(trimmedArg)) {
                        locale = trimmedArg;
                        forceLocale = true;
                    }
                    else {
                        const paramIndex = Object.keys(params).length;
                        params[paramIndex] = trimmedArg;
                    }
                }
                
                if (!forceLocale && localeInstance.autoLanguage) {
                    locale = await localeInstance.detectUserLanguage(d);
                }
                
                if (!locale) {
                    locale = localeInstance.getFirstAvailableLocale();
                }
                
                const text = localeInstance.getText(trimmedKey, locale, params, d);
                
                data.result = text;
                return {
                    code: d.util.setCode(data)
                };
            }
        });
    }

    /**
     * Gets text for the specified key
     * @param {string} key - Translation key
     * @param {string} locale - Target language
     * @param {Array} params - Text parameters
     * @returns {string} Translated text
     */
    getText(key, locale, params = []) {
        let text = this.getFromLocale(key, locale);
        
        if (!text) {
            const firstLocale = this.getFirstAvailableLocale();
            if (firstLocale && firstLocale !== locale) {
                text = this.getFromLocale(key, firstLocale);
            }
        }
        
        if (!text) {
            console.warn(`[aoi.locale] Key '${key}' not found in any locale`);
            return key;
        }

        return this.interpolate(text, params);
    }

    /**
     * Gets text for key from specified locale
     * @param {string} key - Translation key
     * @param {string} locale - Language code
     * @returns {string|null} Text or null
     */
    getFromLocale(key, locale) {
        const localeData = this.locales.get(locale);
        if (!localeData) return null;

        const keys = key.split('.');
        let current = localeData;

        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return null;
            }
        }

        return typeof current === 'string' ? current : null;
    }

    /**
     * Replaces parameters in text
     * @param {string} text - Raw text
     * @param {Array|Object} params - Parameter list or named parameters object
     * @returns {string} Processed text
     */
    interpolate(text, params) {
        if (!params) return text;

        if (typeof params === 'object' && !Array.isArray(params)) {
            text = text.replace(/\{(\w+)\}/g, (match, name) => {
                const lowerName = name.toLowerCase();
                
                if (params.hasOwnProperty(lowerName)) {
                    return params[lowerName];
                }
                
                for (const [key, value] of Object.entries(params)) {
                    if (key.toLowerCase() === lowerName) {
                        return value;
                    }
                }
                
                return match;
            });
            return text;
        }

        if (Array.isArray(params) && params.length === 0) return text;

        text = text.replace(/\{(\d+)\}/g, (match, index) => {
            const i = parseInt(index);
            return params[i] !== undefined ? params[i] : match;
        });

        const namedMappings = {
            'user': 0,
            'username': 0,
            'name': 0,
            'server': 1,
            'servername': 1,
            'guild': 1,
            'channel': 2,
            'level': 3,
            'value': 4
        };

        text = text.replace(/\{(\w+)\}/g, (match, name) => {
            const lowerName = name.toLowerCase();
            
            if (namedMappings.hasOwnProperty(lowerName)) {
                const index = namedMappings[lowerName];
                return params[index] !== undefined ? params[index] : match;
            }
            
            for (const param of params) {
                if (typeof param === 'string' && param.includes('=')) {
                    const [key, value] = param.split('=', 2);
                    if (key.toLowerCase() === lowerName) {
                        return value;
                    }
                }
            }
            
            return match;
        });

        return text;
    }

    /**
     * Changes the current locale
     * @param {string} locale - New locale
     */
    setLocale(locale) {
        if (this.locales.has(locale)) {
            this.currentLocale = locale;
        } else {
            console.warn(`[aoi.locale] Language '${locale}' not found`);
        }
    }

    /**
     * Returns the first available locale
     * @returns {string} First available locale
     */
    getLocale() {
        return this.getFirstAvailableLocale();
    }

    /**
     * Gets the first available locale from loaded locales
     * @returns {string|null} First locale or null
     */
    getFirstAvailableLocale() {
        const locales = Array.from(this.locales.keys());
        return locales.length > 0 ? locales[0] : null;
    }

    /**
     * Returns all loaded locales
     * @returns {Array} Locale list
     */
    getAvailableLocales() {
        return Array.from(this.locales.keys());
    }

    /**
     * Detects user's preferred language from various sources
     * @param {Object} d - aoi.js data object
     * @returns {Promise<string|null>} Detected language or null
     */
    async detectUserLanguage(d) {
        try {
            if (this.customLanguageFunction && typeof this.customLanguageFunction === 'function') {
                const customLang = this.customLanguageFunction(d);
                if (customLang && this.locales.has(customLang)) {
                    return customLang;
                }
            }

            if (this.languageSource) {
                const userLang = await this.executeLanguageSource(this.languageSource, d);
                if (userLang && this.locales.has(userLang)) {
                    return userLang;
                }
            }

            if (this.fallbackToGuildLanguage && this.guildLanguageSource) {
                const guildLang = await this.executeLanguageSource(this.guildLanguageSource, d);
                if (guildLang && this.locales.has(guildLang)) {
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

    /**
     * Adds a new locale file
     * @param {string} locale - Language code
     * @param {Object} data - Translation data
     */
    addLocale(locale, data) {
        this.locales.set(locale, data);
    }
}

module.exports = AoiLocale;
