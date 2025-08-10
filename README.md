# 🌍 aoi.locale

**Multilingual Discord Bot Support for aoi.js**

A powerful internationalization (i18n) module for aoi.js Discord bots with automatic language detection, user preferences, and seamless integration.

## ✨ Features

- 🔄 **Automatic Language Detection** - Detects user language from database variables
- 🎯 **Smart Fallback System** - User → Guild → Default language priority
- 📁 **Modular Architecture** - Clean, organized codebase
- 🔧 **Auto Template Creation** - Automatically creates example locale files
- ⚡ **aoi.js Interpreter Integration** - Uses real aoi.js interpreter for variable access
- 🎨 **Flexible Syntax** - Multiple parameter formats with semicolon separation
- 💾 **Database Fallback** - Direct database access when interpreter fails
- 🔀 **Optional Language Override** - Force specific language when needed
- 📚 **Dot Notation Support** - Nested translation keys (e.g., `user.profile.name`)
- 🚀 **Async/Await Ready** - Full asynchronous support

## 📦 Installation

```bash
npm install aoi.locale
```

## 🚀 Quick Start

```javascript
const { AoiClient } = require('aoi.js');
const AoiLocale = require('aoi.locale');

const client = new AoiClient({
    token: 'YOUR_BOT_TOKEN',
    prefix: '!',
    intents: ['MessageContent', 'Guilds', 'GuildMessages'],
    events: ["onMessage", "onInteractionCreate"]
});

// Initialize aoi.locale
const locale = new AoiLocale();
locale.init(client, {
    localeDir: './locales',
    autoLanguage: true,
    languageSource: 'getUserVar[language;{userId}]',
    guildLanguageSource: 'getServerVar[language;{guildId}]',
    fallbackToGuildLanguage: true
});

// Create commands
client.command({
    name: 'hello',
    code: `$locale[hello;user:$username]`
});

client.command({
    name: 'setlang',
    code: `
        $setUserVar[language;$message[1];$authorID]
        $locale[success;$message[1]]
    `
});
```

## 📁 Directory Structure

```
your-bot/
├── locales/              # Language files (auto-generated if missing)
│   ├── en.json           # English language file
│   └── ...               # Add more languages as needed
└── index.js              # Your bot file
```

## ⚙️ Configuration Options

```javascript
locale.init(client, {
    // Language files directory
    localeDir: './locales',
    
    // Auto language detection (always enabled)
    autoLanguage: true,
    
    // Debug mode for detailed logging
    debug: false,
    
    // User language source template
    languageSource: 'getUserVar[language;{userId}]',
    
    // Guild language source template
    guildLanguageSource: 'getServerVar[language;{guildId}]',
    
    // Fall back to guild language if user has none
    fallbackToGuildLanguage: true,
    
    // Custom language detection function
    customLanguageFunction: (d) => {
        // Custom logic here
        return null; // Return null to continue with other methods
    }
});
```

## 💬 Usage Syntax

### Basic Usage (Auto Language Detection)
```javascript
$locale[welcome]                           // Simple key
$locale[hello;user:$username]              // Named parameter
$locale[server_info;user:$username;server:$servername]  // Multiple parameters
```

### With Optional Language Override
```javascript
$locale[success;en]                        // Force English
$locale[hello;user:$username;tr]           // Named parameter + Force Turkish
$locale[welcome;language?|en]              // Fallback language syntax
```

## 🎯 Language Detection Priority

1. **Custom Function** - Your custom detection logic
2. **User Language** - `getUserVar[language;{userId}]`
3. **Guild Language** - `getServerVar[language;{guildId}]`
4. **First Available** - First loaded language file

## 📝 Language File Format

### locales/en.json
```json
{
    "welcome": "Welcome to our server!",
    "hello": "Hello {user}!",
    "success": "Operation completed successfully!",
    "error": "An error occurred!",
    "user": {
        "profile": {
            "name": "User: {user}",
            "level": "Level: {level}"
        }
    },
    "help": {
        "title": "Bot Commands",
        "description": "List of available commands"
    }
}
```

## 🔧 Advanced Features

### Dot Notation Support
```javascript
$locale[user.profile.name;user:$username]  // Accesses nested keys
$locale[help.title]                        // Simple nested access
```

### Parameter Interpolation
```javascript
// Named parameters (recommended)
$locale[hello;user:$username]

// Multiple named parameters
$locale[server_info;user:$username;server:$servername;level:5]

// Legacy indexed parameters
$locale[hello;$username]                   // {0} in translation
```

### Dynamic Language Addition
```javascript
// Add language programmatically
locale.addLocale('es', {
    "welcome": "¡Bienvenido a nuestro servidor!",
    "hello": "¡Hola {user}!"
});
```

## 🛠️ API Reference

### AoiLocale Class

#### Methods

- `init(client, options)` - Initialize the module
- `loadLocales()` - Load language files from directory
- `getText(key, locale, params)` - Get translated text
- `addLocale(locale, data)` - Add new language
- `getAvailableLocales()` - Get list of available languages
- `setLocale(locale)` - Set current locale (legacy)

#### Properties

- `locales` - Map of loaded language data
- `client` - aoi.js client instance
- `autoLanguage` - Auto detection enabled status
- `languageSource` - User language source template
- `guildLanguageSource` - Guild language source template

## 🔍 Debugging

Enable debug mode to see detailed language detection process:

```javascript
// Enable debug mode
const locale = new AoiLocale();
locale.init(client, {
    debug: true,  // Enable detailed logging
    localeDir: './locales',
    languageSource: 'getUserVar[language;{userId}]'
});
```

**Console output with debug enabled:**
```
[aoi.locale] Starting language detection for user: 123456789
[aoi.locale] Trying user language source: getUserVar[language;{userId}]
[aoi.locale] User language source returned: tr
[aoi.locale] ✅ Using user language: tr
```

**Debug vs Normal Mode:**
- **debug: false** (default) - Only errors and warnings
- **debug: true** - Detailed step-by-step language detection logs

## 🚨 Error Handling

The module includes comprehensive error handling:

- **File Loading Errors** - Graceful fallback to basic examples
- **Interpreter Errors** - Falls back to direct database access
- **Missing Keys** - Returns key name as fallback
- **Invalid Locales** - Falls back to first available language

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Discord Server**: [Join our Discord](https://discord.gg/exud3Bdunm)
- **GitHub Issues**: [Report bugs](https://github.com/fhyrox/aoi.locale/issues)

## 🏆 Acknowledgments

- Built for [aoi.js](https://aoi.js.org) Discord bot framework
- Inspired by i18next and similar internationalization libraries
- Thanks to the aoi.js community for feedback and testing

---

**Made with ❤️ for the aoi.js community**
