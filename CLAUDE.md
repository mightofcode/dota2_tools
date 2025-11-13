# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

使用中文对话
模仿游戏原神的语气说话
不要写测试代码 我自己会测试代码
不要使用git提及代码 我自己手动操作

## Project Overview

This is a **Dota 2 Mod Development Tools** project that provides scripts and utilities for managing cosmetic items (clothing/wearables) for Dota 2 heroes. It parses Dota 2 configuration files (KV format) to extract and organize cosmetic item data, enabling mod developers to easily construct item configurations.

## Key Technologies

- **Node.js**: Runtime environment
- **valve-kv**: Parser for Valve's KV (KeyValue) configuration file format
- **fs-extra**: Enhanced file system operations
- **chalk**: Terminal color and styling
- **chokidar**: File system watcher for automatic data updates
- **dotenv**: Environment variable management

## Project Structure

- `./scripts/cloth.js` - Main script containing all logic for parsing Dota 2 items data and managing an interactive CLI
- `./doc/cloth/` - Output directory containing parsed hero cosmetic data organized by hero (auto-generated, git-ignored)
  - Each hero has a JSON file (`{heroname}.json`) with their cosmetics
  - `all.json` - Common items across all heroes
  - `cloth.json` - Items not associated with any specific hero
- `./tmp/` - Temporary directory (git-ignored)
- `./a/` - Archive/working directory

## Common Development Commands

```bash
# Start the interactive tool
npm start

# Run the cloth.js script directly
node scripts/cloth.js

# Force refresh - clear cache and re-parse items_game.txt
node scripts/cloth.js -f
# or
node scripts/cloth.js --force
```

## Core Architecture

### Main Script: `scripts/cloth.js` (1154 lines)

The script is a single-file CLI tool with the following key components:

**Data Parsing Layer:**
- `analyzeItemsGame()` - Main entry point that reads Dota 2 `items_game.txt` (KV format) from configured path
- `buildItemsIndex()` - Creates an indexable map of all items by name for fast lookups
- `analyzeDefaultItems()` - Extracts cosmetic items with `prefab=default_item`
- `analyzeItemSets()` - Organizes items into themed cosmetic sets
- `analyzeItemsByHero()` - Groups items by the heroes they can be used with
- `analyzePersonaItems()` - Special handling for "Persona" items (hero alternate appearances)

**Output Generation:**
- `generateClothsData()` - Writes parsed data to JSON files organized by hero
- `itemListToKV()` - Converts item selections back to Dota 2 KV format for use in mod configs
- `mergeItemLists()` - Combines items from different sources (defaults, sets, individual items)

**Interactive CLI State & Commands:**
- Interactive mode with state management (`selectedUnit`, `itemList`, `selectedPersona`)
- Commands implemented (text-based):
  - `unit <name>` - Select a hero/unit to work with (fuzzy search across available heroes)
  - `item <query>` - Add a cosmetic item (fuzzy search within hero's items)
  - `set [query]` - Add an item set (grouped cosmetics). With no args, shows all available sets
  - `persona` - Switch to a Persona mode (alternate hero appearance)
  - `status` - Show current selection state and all selected items
  - `dump` - Export current selection as KV format (Dota 2 config syntax)
  - `clear` - Reset all selections
  - `exit` or `quit` - Exit the tool

**Helper Functions:**
- `fuzzySearch()` / `findItemByName()` / `findItemSetByName()` - Search with substring matching, prioritize prefix matches
- `selectUnit()` / `selectItem()` / `selectItemSet()` / `selectPersona()` - User interaction prompts
- `displayItemList()` / `displayItemSetList()` / `displayItemResultsList()` - Terminal output formatting

### Key Configuration

The hardcoded path is:
```javascript
const itemsGamePath = 'C:/data/dota2unpack/scripts/items/items_game.txt';
```

This expects an unpacked Dota 2 items configuration file. The script includes caching: if `./doc/cloth/` already contains parsed files, it skips re-parsing and loads from cache.

**Cache Behavior:**
- First run or after `-f` flag: Parses the source KV file (requires the file to exist)
- Subsequent runs: Loads from cached JSON files in `./doc/cloth/`
- Use `-f` or `--force` flag to clear cache and force re-parsing

### Command-Line Arguments

The script supports the following command-line arguments:
- `-f` or `--force` - Clear the cache directory and force re-parsing of the items_game.txt file

### Data Model

Each hero's JSON file (`./doc/cloth/{heroname}.json`) contains:
```json
{
  "defaults": {},        // Default cosmetics for this hero
  "item_sets": [],       // Themed cosmetic bundles
  "items": [],           // All available cosmetics for this hero
  "personaList": []      // Persona (alternate appearance) options
}
```

Each item object includes:
- `id`, `name`, `item_name` - Identifiers
- `item_slot` - Cosmetic slot type (e.g., "weapon", "head", "persona_selector")
- `item_rarity` - Cosmetic rarity level
- `model_player` - 3D model path (if applicable)

## Development Notes

1. **No tests defined** - The `test` script is a placeholder: `echo "Error: no test specified"`
2. **Single entry point** - All functionality is in `cloth.js` (1154 lines); no modular separation
3. **Chinese comments and output** - Code uses Chinese for comments, console messages, and user-facing text
4. **Hardcoded paths** - The source items file path is hardcoded to a Windows path; consider making it configurable via environment variables
5. **Interactive prompts** - Uses Node.js `readline` module for user input; runs as a long-lived interactive process
6. **Output formatting** - Uses `chalk` for colored terminal output to aid readability
7. **KV format export** - The `itemListToKV()` function generates Dota 2 KV syntax that can be embedded in mod configuration files
8. **Unused dependencies** - `chokidar` and `dotenv` are installed but not used in the current code

**Main Function Flow:**
```
require.main === module
  → parseArguments()
  → analyzeItemsGame()
     → Check cache at ./doc/cloth/
     → If no cache, read items_game.txt and parse with valve-kv
     → buildItemsIndex()
     → analyzeDefaultItems()
     → analyzeItemSets()
     → analyzeItemsByHero()
     → analyzePersonaItems()
     → generateClothsData() → outputs JSON files
  → startInteractiveCLI()
     → Initialize readline interface
     → Prompt for commands in a loop
     → handleCommand() processes each input
```

## Linting and Formatting

- **ESLint** - Installed but not configured (no `.eslintrc` file)
- **Prettier** - Installed but not configured (no `.prettierrc` file)
- To add linting: Create `.eslintrc.json` and run `npx eslint scripts/cloth.js`
- To format: Run `npx prettier --write scripts/cloth.js`

## Notes for Contributors

- The tool is designed to be a single-file, self-contained CLI script
- All state management is in-memory (no persistent state except file outputs)
- Cache invalidation is not implemented (always use cached data if available)
- Consider making the source path configurable via environment variables or command-line arguments
- The interactive CLI could benefit from a proper CLI framework (e.g., `commander.js`, `yargs`) for cleaner command parsing
