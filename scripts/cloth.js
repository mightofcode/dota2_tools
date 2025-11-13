const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { deserialize } = require('valve-kv');

// 配置文件路径
const itemsGamePath = 'C:/data/dota2unpack/scripts/items/items_game.txt';

// 全局物品索引
let itemsIndex = {};

function analyzeItemsByHero(data) {
    console.log(chalk.cyan('\n=== 分析英雄物品信息 ==='));

    if (!data.items_game || !data.items_game.items) {
        console.log(chalk.red('未找到 items_game.items 数据'));
        return {};
    }

    const items = data.items_game.items;
    const heroItems = {};

    Object.keys(items).forEach(itemId => {
        const item = items[itemId];

        if (item && item.used_by_heroes) {
            const itemInfo = {
                id: itemId,
                name: item.name,
                item_name: item.item_name,
                item_slot: item.item_slot || 'weapon',
                item_rarity: item.item_rarity || 'common',
                prefab: item.prefab,
                model_player: item.model_player
            };

            Object.keys(item.used_by_heroes).forEach(heroName => {
                if (heroName !== '0') { // 过滤掉英雄名为"0"的数据
                    if (!heroItems[heroName]) {
                        heroItems[heroName] = [];
                    }
                    heroItems[heroName].push(itemInfo);
                }
            });
        }
    });

    console.log(`处理了 ${Object.keys(heroItems).length} 个英雄的物品信息`);
    return heroItems;
}

async function generateClothsData(defaultItems, itemSets, heroItems, personaItems) {
    console.log(chalk.cyan('\n=== 生成英雄默认饰品数据 ==='));

    const clothDir = './doc/cloth';
    await fs.ensureDir(clothDir);

    const heroDefaults = {};
    const unrelatedItems = [];

    // 处理默认饰品
    defaultItems.forEach(item => {
        // 过滤掉name包含persona的物品
        if (item.item_name.toLowerCase().includes('persona')) {
            return;
        }

        // 过滤掉特定的item_slot
        if (item.item_slot === 'hero_base' ||
            item.item_slot === 'summon' ||
            item.item_slot.startsWith('ability')) {
            return;
        }

        const heroes = Object.keys(item.used_by_heroes);
        let hasHero = false;

        heroes.forEach(heroName => {
            if (heroName !== '0') { // 过滤掉英雄名为"0"的数据
                hasHero = true;
                if (!heroDefaults[heroName]) {
                    heroDefaults[heroName] = {};
                }

                heroDefaults[heroName][item.item_slot] = {
                    id: item.id,
                    name: item.name,
                    item_name: item.item_name,
                    item_slot: item.item_slot,
                    item_rarity: item.item_rarity,
                    model_player: item.model_player
                };
            }
        });

        // 如果没有关联到任何英雄，加入未关联列表
        if (!hasHero) {
            unrelatedItems.push(item);
        }
    });

    // 获取所有英雄集合
    const allHeroes = new Set();
    Object.keys(heroDefaults).forEach(hero => allHeroes.add(hero));
    Object.keys(itemSets).forEach(hero => allHeroes.add(hero));
    Object.keys(heroItems).forEach(hero => allHeroes.add(hero));
    Object.keys(personaItems).forEach(hero => allHeroes.add(hero));

    // 保存每个英雄的数据
    const savedHeroes = [];
    for (const heroName of allHeroes) {
        const heroData = {
            defaults: heroDefaults[heroName] || {},
            item_sets: itemSets[heroName] || [],
            items: heroItems[heroName] || [],
            personaList: personaItems[heroName] || []
        };

        const heroFile = path.join(clothDir, `${heroName}.json`);
        await fs.writeJson(heroFile, heroData, { spaces: 2 });
        savedHeroes.push(heroName);
    }

    // 保存未关联的数据
    if (unrelatedItems.length > 0) {
        const unrelatedPath = path.join(clothDir, 'cloth.json');
        const unrelatedData = {
            items: unrelatedItems,
            description: '未关联到任何英雄的饰品数据'
        };
        await fs.writeJson(unrelatedPath, unrelatedData, { spaces: 2 });
        console.log(chalk.green(`未关联数据已保存到: ${unrelatedPath}`));
    }

    console.log(chalk.green(`数据已保存到: ${clothDir}`));
    console.log(chalk.yellow(`共处理 ${savedHeroes.length} 个英雄`));
    console.log(chalk.yellow(`未关联物品: ${unrelatedItems.length} 个`));

    return {
        heroCount: savedHeroes.length,
        unrelatedCount: unrelatedItems.length,
        heroes: savedHeroes
    };
}

async function analyzeItemsGame() {
    console.log(chalk.blue('开始分析dota2饰品配置文件...'));

    try {
        const clothDir = './doc/cloth';

        // 检查缓存目录是否存在
        if (await fs.pathExists(clothDir)) {
            const files = await fs.readdir(clothDir);
            if (files.length > 0) {
                console.log(chalk.yellow(`检测到已存在的缓存目录: ${clothDir}`));
                console.log(chalk.green('直接读取缓存数据，跳过重新解析'));

                // 读取所有缓存文件
                const cachedData = {};
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const filePath = path.join(clothDir, file);
                        cachedData[file] = await fs.readJson(filePath);
                    }
                }
                return cachedData;
            }
        }

        // 检查源文件是否存在
        if (!await fs.pathExists(itemsGamePath)) {
            console.log(chalk.red(`文件不存在: ${itemsGamePath}`));
            return;
        }

        // 读取文件内容
        const content = await fs.readFile(itemsGamePath, 'utf8');
        console.log(chalk.green(`文件读取成功，大小: ${content.length} 字符`));

        // 使用valve-kv解析内容
        const parsed = deserialize(content);
        console.log(chalk.yellow('KV文件解析完成'));

        // 建立物品索引
        buildItemsIndex(parsed);

        // 打印树形结构
        printTreeStructure(parsed);

        // 分析default_item物品
        const defaultItems = analyzeDefaultItems(parsed);

        // 分析套装信息
        const itemSets = analyzeItemSets(parsed);

        // 分析英雄物品信息
        const heroItems = analyzeItemsByHero(parsed);

        // 分析身心(Persona)物品
        const personaItems = analyzePersonaItems(parsed);

        // 生成并保存结果 - 按英雄分别保存
        await generateClothsData(defaultItems, itemSets, heroItems, personaItems);

        return parsed;

    } catch (error) {
        console.log(chalk.red(`分析失败: ${error.message}`));
        throw error;
    }
}

function buildItemsIndex(data) {
    console.log(chalk.cyan('\n=== 建立物品索引 ==='));
    
    if (!data.items_game || !data.items_game.items) {
        console.log(chalk.red('未找到 items_game.items 数据'));
        return;
    }
    
    const items = data.items_game.items;
    itemsIndex = {};
    
    Object.keys(items).forEach(itemId => {
        const item = items[itemId];
        if (item && item.name) {
            itemsIndex[item.name] = {
                id: itemId,
                name: item.name,
                item_name: item.item_name || item.name,
                item_slot: item.item_slot || 'weapon',
                item_rarity: item.item_rarity || 'common',
                prefab: item.prefab,
                used_by_heroes: item.used_by_heroes || {},
                ...item // 包含所有原始属性
            };
        }
    });
    
    console.log(`物品索引建立完成，共 ${Object.keys(itemsIndex).length} 个物品`);
}

function getItemByName(name) {
    return itemsIndex[name] || null;
}

function printTreeStructure(data, depth = 0) {
    if (depth > 1) return; // 只显示两层
    
    const indent = '  '.repeat(depth);
    
    if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        
        keys.forEach(key => {
            const value = data[key];
            
            if (typeof value === 'object' && value !== null) {
                const subKeys = Object.keys(value);
                console.log(`${indent}├─ ${chalk.cyan(key)} (${subKeys.length} 个子项)`);
                
                if (depth < 1) {
                    printTreeStructure(value, depth + 1);
                }
            } else {
                console.log(`${indent}├─ ${chalk.green(key)}: ${chalk.yellow(typeof value)}`);
            }
        });
    }
}

function analyzeDefaultItems(data) {
    console.log(chalk.cyan('\n=== 分析 prefab=default_item 的物品 ==='));
    
    if (!data.items_game || !data.items_game.items) {
        console.log(chalk.red('未找到 items_game.items 数据'));
        return;
    }
    
    const items = data.items_game.items;
    const defaultItems = [];
    
    Object.keys(items).forEach(itemId => {
        const item = items[itemId];
        
        if (item && item.prefab === 'default_item') {
            const itemInfo = {
                id: itemId,
                name: item.name || item.item_name || '未知',
                item_name: item.item_name || '未知',
                item_slot: item.item_slot || 'weapon',
                item_rarity: item.item_rarity || 'common',
                model_player: item.model_player,
                used_by_heroes: item.used_by_heroes || {}
            };

            defaultItems.push(itemInfo);
        }
    });
    
    console.log(`\n找到 ${defaultItems.length} 个 default_item 物品`);
    
    return defaultItems;
}

function analyzePersonaItems(data) {
    console.log(chalk.cyan('\n=== 分析身心(Persona)物品 ==='));

    if (!data.items_game || !data.items_game.items) {
        console.log(chalk.red('未找到 items_game.items 数据'));
        return {};
    }

    const items = data.items_game.items;
    const personaItems = {};

    Object.keys(items).forEach(itemId => {
        const item = items[itemId];

        if (item && item.item_slot === 'persona_selector') {
            // 查找 entity_model 类型的 asset_modifier
            let entityModel = null;
            const soundModifiers = [];

            if (item.visuals && item.visuals.asset_modifier) {
                const modifiers = Array.isArray(item.visuals.asset_modifier)
                    ? item.visuals.asset_modifier
                    : [item.visuals.asset_modifier];

                modifiers.forEach(m => {
                    if (m) {
                        // 查找 entity_model
                        if (m.type === 'entity_model' && m.modifier) {
                            entityModel = m.modifier;
                        }
                        // 收集 sound 类型的 asset_modifier
                        if (m.type === 'sound') {
                            soundModifiers.push({
                                asset: m.asset,
                                modifier: m.modifier
                            });
                        }
                    }
                });
            }

            // 构建 visuals 对象
            const visuals = soundModifiers.length > 0 ? {
                sound: soundModifiers
            } : null;

            // 验证：visuals 不为空才保存
            if (visuals === null) {
                console.log(chalk.yellow(`跳过无效的persona物品 (ID: ${itemId}, 无visuals数据)`));
                return;
            }

            const personaInfo = {
                id: itemId,
                name: item.name,
                item_name: item.item_name,
                item_slot: item.item_slot,
                item_rarity: item.item_rarity || 'common',
                prefab: item.prefab,
                model_player: item.model_player,
                entity_model: entityModel,
                visuals: visuals
            };

            // 收集使用该身心的英雄
            if (item.used_by_heroes) {
                Object.keys(item.used_by_heroes).forEach(heroName => {
                    if (heroName !== '0') { // 过滤掉英雄名为"0"的数据
                        if (!personaItems[heroName]) {
                            personaItems[heroName] = [];
                        }
                        personaItems[heroName].push(personaInfo);
                    }
                });
            }
        }
    });

    console.log(`处理了 ${Object.keys(personaItems).length} 个英雄的身心物品`);
    return personaItems;
}

function analyzeItemSets(data) {
    console.log(chalk.cyan('\n=== 分析套装信息 ==='));
    
    if (!data.items_game || !data.items_game.item_sets) {
        console.log(chalk.red('未找到 items_game.item_sets 数据'));
        return {};
    }
    
    const itemSets = data.items_game.item_sets;
    const heroSets = {};
    
    Object.keys(itemSets).forEach(setName => {
        const setData = itemSets[setName];
        
        if (setData && setData.items) {
            const setItems = [];
            const setHeroes = new Set();
            
            // 收集套装中的物品信息
            Object.keys(setData.items).forEach(itemName => {
                const itemInfo = getItemByName(itemName);
                
                if (itemInfo) {
                    setItems.push({
                        name: itemInfo.name,
                        id: itemInfo.id,
                        item_name: itemInfo.item_name,
                        item_slot: itemInfo.item_slot,
                        item_rarity: itemInfo.item_rarity,
                        model_player: itemInfo.model_player
                    });
                    
                    // 收集使用该物品的英雄
                    if (itemInfo.used_by_heroes) {
                        Object.keys(itemInfo.used_by_heroes).forEach(heroName => {
                            if (heroName !== '0') { // 过滤掉英雄名为"0"的数据
                                setHeroes.add(heroName);
                            }
                        });
                    }
                }
            });
            
            // 检测是否为persona套装（包含_persona的item_slot）
            const isPersonaSet = setItems.some(item => item.item_slot.includes('_persona'));

            const setInfo = {
                name: setData.name || setName,
                store_bundle: setData.store_bundle,
                portrait_image: setData.portrait_image,
                items: setItems,
                isPersonaSet: isPersonaSet
            };
            
            // 为每个英雄添加套装信息
            setHeroes.forEach(heroName => {
                if (!heroSets[heroName]) {
                    heroSets[heroName] = [];
                }
                heroSets[heroName].push(setInfo);
            });
        }
    });
    
    console.log(`处理了 ${Object.keys(heroSets).length} 个英雄的套装信息`);
    return heroSets;
}

// 模糊搜索函数
function fuzzySearch(query, items) {
    if (!query) return [];

    const queryLower = query.toLowerCase();
    const results = items.filter(item => {
        return item.toLowerCase().includes(queryLower);
    });

    return results.sort((a, b) => {
        // 优先匹配开头的项
        const aStartsWith = a.toLowerCase().startsWith(queryLower);
        const bStartsWith = b.toLowerCase().startsWith(queryLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // 按长度排序（更接近搜索词的排前面）
        return a.length - b.length;
    });
}

// 获取所有单位（以npc_dota_开头的文件）
async function getAllUnits(clothDir = './doc/cloth') {
    try {
        const files = await fs.readdir(clothDir);
        const units = files
            .filter(file => file.startsWith('npc_dota_') && file.endsWith('.json'))
            .map(file => file.replace('.json', ''));

        return units.sort();
    } catch (error) {
        console.log(chalk.red('无法读取单位列表'));
        return [];
    }
}

// 加载单位的物品数据
async function loadUnitClothData(unitName, clothDir = './doc/cloth') {
    try {
        const filePath = path.join(clothDir, `${unitName}.json`);
        const data = await fs.readJson(filePath);
        return data || { defaults: {}, item_sets: [], items: [] };
    } catch (error) {
        console.log(chalk.red(`无法加载单位数据: ${error.message}`));
        return null;
    }
}

// 从套装中查找物品
function findItemSetByName(query, itemSets) {
    if (!query || !itemSets || itemSets.length === 0) {
        return [];
    }

    const queryLower = query.toLowerCase();
    const results = itemSets.filter(set => {
        return set.name.toLowerCase().includes(queryLower);
    });

    return results.sort((a, b) => {
        // 优先匹配开头的项
        const aStartsWith = a.name.toLowerCase().startsWith(queryLower);
        const bStartsWith = b.name.toLowerCase().startsWith(queryLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return a.name.length - b.name.length;
    });
}

// 合并物品列表（后添加的物品优先级更高）
function mergeItemLists(baseItems, newItems) {
    const merged = { ...baseItems };

    newItems.forEach(item => {
        merged[item.item_slot] = item;
    });

    return merged;
}

// 显示套装列表
function displayItemSetList(sets) {
    if (sets.length === 0) {
        console.log(chalk.yellow('未找到任何套装'));
        return;
    }

    console.log(chalk.cyan(`\n找到 ${sets.length} 个匹配的套装:\n`));
    sets.forEach((set, index) => {
        const personaLabel = set.isPersonaSet ? chalk.magenta(' [PERSONA]') : '';
        console.log(`  ${chalk.yellow(index + 1)}. ${set.store_bundle}${personaLabel}`);
        console.log(`     包含 ${set.items.length} 件物品`);
    });
    console.log();
}

// 显示物品列表
function displayItemList(items) {
    if (Object.keys(items).length === 0) {
        console.log(chalk.yellow('物品列表为空'));
        return;
    }

    console.log(chalk.cyan('\n=== 物品列表 ===\n'));
    let index = 1;
    Object.entries(items).forEach(([slot, item]) => {
        console.log(`${chalk.yellow(index)}. [${slot}] ${chalk.green(item.name)} (${item.item_rarity})`);
        console.log(`   ID: ${item.id}, Name: ${item.item_name}`);
        index++;
    });
    console.log();
}

// 处理 clear 命令
function handleClearCommand(state) {
    state.selectedUnit = null;
    state.itemList = {};
    state.unitClothData = null;
    state.selectedPersona = null;
    console.log(chalk.yellow('已重置状态'));
}

// 处理 exit 命令
function handleExitCommand() {
    console.log(chalk.yellow('\n已退出交互式模式'));
    process.exit(0);
}

// 处理 status 命令
function handleStatusCommand(state) {
    if (!state.selectedUnit) {
        console.log(chalk.yellow('未选择任何单位'));
    } else {
        console.log(chalk.cyan('\n=== 当前状态 ===\n'));
        console.log(`选中单位: ${chalk.green(state.selectedUnit)}`);

        if (state.selectedPersona) {
            console.log(`选中 Persona: ${chalk.green(state.selectedPersona.name)}`);
            console.log(`Entity Model: ${chalk.cyan(state.selectedPersona.entity_model || 'N/A')}`);
        }

        console.log(`物品数量: ${chalk.yellow(Object.keys(state.itemList).length)} 件\n`);

        if (Object.keys(state.itemList).length > 0) {
            displayItemList(state.itemList);
        }
    }
}

// 处理 persona 命令 - 选择 persona 时的询问
async function selectPersona(rl, personaList, state) {
    return new Promise((resolve) => {
        console.log(chalk.cyan(`\n找到 ${personaList.length} 个 Persona:\n`));
        personaList.forEach((persona, index) => {
            console.log(`  ${chalk.yellow(index + 1)}. ${persona.name} (${persona.item_rarity})`);
            if (persona.entity_model) {
                console.log(`     Model: ${persona.entity_model}`);
            }
        });
        console.log();

        rl.question('请输入序号选择 Persona (或按 Enter 返回): ', (choice) => {
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < personaList.length) {
                const selectedPersona = personaList[index];
                state.selectedPersona = selectedPersona;
                state.itemList = {}; // 清空物品列表
                console.log(chalk.green(`✓ 已选择 Persona: ${selectedPersona.name}`));
                console.log(chalk.cyan(`Entity Model: ${selectedPersona.entity_model || 'N/A'}`));
                console.log(chalk.yellow('物品列表已清空'));
            } else if (choice === '') {
                console.log(chalk.yellow('已取消选择'));
            } else {
                console.log(chalk.red('无效的选择'));
            }
            resolve();
        });
    });
}

// 处理 persona 命令
async function handlePersonaCommand(state, rl) {
    if (!state.selectedUnit) {
        console.log(chalk.red('请先选择一个单位'));
        return;
    }

    const personaList = state.unitClothData?.personaList || [];

    if (personaList.length === 0) {
        console.log(chalk.yellow('该单位没有任何 Persona 物品'));
        return;
    }

    if (personaList.length === 1) {
        // 直接选择唯一的 persona
        state.selectedPersona = personaList[0];
        state.itemList = {}; // 清空物品列表
        console.log(chalk.green(`✓ 已选择 Persona: ${personaList[0].name}`));
        console.log(chalk.cyan(`Entity Model: ${personaList[0].entity_model || 'N/A'}`));
        console.log(chalk.yellow('物品列表已清空'));
    } else {
        // 显示多个 persona 供选择
        await selectPersona(rl, personaList, state);
    }
}

// 处理 set 命令 - 选择套装时的询问
async function selectItemSet(rl, results, state) {
    return new Promise((resolve) => {
        displayItemSetList(results);

        rl.question('请输入序号选择套装 (或按 Enter 返回): ', (choice) => {
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < results.length) {
                state.itemList = mergeItemLists(state.itemList, results[index].items);
                console.log(chalk.green(`✓ 已添加套装: ${results[index].store_bundle}`));
                console.log(chalk.cyan(`当前物品数量: ${Object.keys(state.itemList).length} 件`));
                displayItemList(state.itemList);
            } else if (choice === '') {
                console.log(chalk.yellow('已取消添加'));
            } else {
                console.log(chalk.red('无效的选择'));
            }
            resolve();
        });
    });
}

// 处理 set 命令
async function handleSetCommand(command, state, rl) {
    if (!state.selectedUnit) {
        console.log(chalk.red('请先选择一个单位'));
        return;
    }

    const setQuery = command.substring(4).trim();
    const itemSets = state.unitClothData?.item_sets || [];

    // 如果没有参数，列出所有套装
    if (!setQuery) {
        if (itemSets.length === 0) {
            console.log(chalk.yellow('该单位没有任何套装'));
            return;
        }

        console.log(chalk.cyan(`\n找到 ${itemSets.length} 个套装:\n`));

        // 按照套装名称的字母排序
        const sortedSets = [...itemSets].sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        sortedSets.forEach((set, index) => {
            const personaLabel = set.isPersonaSet ? chalk.magenta(' [PERSONA]') : '';
            console.log(`  ${chalk.yellow(index + 1)}. ${set.store_bundle}${personaLabel} (${set.items.length} 件物品)`);
        });
        console.log();

        // 提示用户输入序号 - 使用 Promise 包装
        return new Promise((resolve) => {
            rl.question('请输入序号选择套装 (或按 Enter 返回): ', (choice) => {
                const index = parseInt(choice) - 1;
                if (index >= 0 && index < sortedSets.length) {
                    state.itemList = mergeItemLists(state.itemList, sortedSets[index].items);
                    console.log(chalk.green(`✓ 已添加套装: ${sortedSets[index].store_bundle}`));
                    console.log(chalk.cyan(`当前物品数量: ${Object.keys(state.itemList).length} 件`));
                    displayItemList(state.itemList);
                } else if (choice === '') {
                    console.log(chalk.yellow('已取消选择'));
                } else {
                    console.log(chalk.red('无效的选择'));
                }
                resolve();
            });
        });
    }

    // 有参数时，进行模糊搜索
    const results = findItemSetByName(setQuery, itemSets);

    if (results.length === 0) {
        console.log(chalk.red(`未找到匹配 "${setQuery}" 的套装`));
    } else if (results.length === 1) {
        // 直接添加唯一的套装
        state.itemList = mergeItemLists(state.itemList, results[0].items);
        console.log(chalk.green(`✓ 已添加套装: ${results[0].store_bundle}`));
        console.log(chalk.cyan(`当前物品数量: ${Object.keys(state.itemList).length} 件`));
        displayItemList(state.itemList);
    } else {
        // 显示多个套装供选择
        await selectItemSet(rl, results, state);
    }
}

// 处理选择单位时的询问
async function selectUnit(rl, results, state, allUnits) {
    return new Promise((resolve) => {
        console.log(chalk.cyan(`\n找到 ${results.length} 个匹配的单位:\n`));
        results.forEach((unit, index) => {
            console.log(`  ${chalk.yellow(index + 1)}. ${unit}`);
        });
        console.log();

        rl.question('请输入序号选择单位 (或按 Enter 返回): ', async (choice) => {
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < results.length) {
                await selectUnitByName(results[index], state);
            } else if (choice === '') {
                console.log(chalk.yellow('已取消选择'));
            } else {
                console.log(chalk.red('无效的选择'));
            }
            resolve();
        });
    });
}

// 通过单位名称选择单位（共用逻辑）
async function selectUnitByName(unitName, state) {
    state.selectedUnit = unitName;

    // 自动加载单位的物品数据
    const clothData = await loadUnitClothData(unitName);
    if (clothData && clothData.defaults) {
        state.unitClothData = clothData;
        state.itemList = clothData.defaults;
        console.log(chalk.green(`✓ 已选择单位: ${unitName}`));
        console.log(chalk.cyan(`已加载 ${Object.keys(state.itemList).length} 件物品`));
        displayItemList(state.itemList);
    } else {
        console.log(chalk.yellow(`单位 ${unitName} 没有物品数据`));
    }
}

// 处理单位搜索和选择
async function handleUnitSearch(command, state, rl, allUnits) {
    const results = fuzzySearch(command, allUnits);

    if (results.length === 0) {
        console.log(chalk.red(`未找到匹配 "${command}" 的单位`));
    } else if (results.length === 1) {
        await selectUnitByName(results[0], state);
    } else {
        await selectUnit(rl, results, state, allUnits);
    }
}

// 解析命令为 token 数组
function parseCommandTokens(command) {
    return command.trim().split(/\s+/).filter(token => token.length > 0);
}

// 处理用户输入的命令
async function handleCommand(command, state, rl, allUnits) {
    if (!command) {
        return;
    }

    const tokens = parseCommandTokens(command);
    if (tokens.length === 0) {
        return;
    }

    const cmd = tokens[0];
    const args = tokens.slice(1);

    // 内置命令
    if (cmd === 'clear') {
        handleClearCommand(state);
        return;
    }

    if (cmd === 'exit' || cmd === 'quit') {
        handleExitCommand();
        return;
    }

    if (cmd === 'status') {
        handleStatusCommand(state);
        return;
    }

    if (cmd === 'persona') {
        await handlePersonaCommand(state, rl);
        return;
    }

    if (cmd === 'set') {
        // 重新构造原始命令传递给 handleSetCommand
        // 如果有参数，拼接回去；如果没有参数，传递 'set'
        const originalCommand = args.length > 0 ? `set ${args.join(' ')}` : 'set';
        await handleSetCommand(originalCommand, state, rl);
        return;
    }

    // 如果没有选择单位，则进行单位搜索
    if (!state.selectedUnit) {
        await handleUnitSearch(command, state, rl, allUnits);
    } else {
        // 如果已选择单位，处理其他命令
        console.log(chalk.blue(`[${state.selectedUnit}] 收到指令: ${command}`));
    }
}

// 显示帮助信息
function showHelp() {
    console.log(chalk.cyan('进入交互式CLI模式'));
    console.log(chalk.yellow('请输入单位名称 (以 npc_dota_ 开头) 进行搜索'));
    console.log(chalk.yellow('命令:'));
    console.log(chalk.yellow('  set <套装名>  - 添加套装'));
    console.log(chalk.yellow('  persona      - 选择 Persona'));
    console.log(chalk.yellow('  status       - 显示当前状态'));
    console.log(chalk.yellow('  clear        - 重置状态'));
    console.log(chalk.yellow('  exit/quit    - 退出\n'));
}

// 交互式CLI模式
async function startInteractiveCLI() {
    const readline = require('readline');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // 状态管理
    const state = {
        selectedUnit: null,
        itemList: {},
        unitClothData: null,
        selectedPersona: null
    };

    const allUnits = await getAllUnits();

    // 显示帮助信息
    showHelp();

    // 交互式命令循环
    const askForCommand = async () => {
        const prompt = state.selectedUnit
            ? `cloth[${chalk.green(state.selectedUnit)}]> `
            : 'cloth> ';

        rl.question(prompt, async (input) => {
            const command = input.trim();
            await handleCommand(command, state, rl, allUnits);
            askForCommand();
        });
    };

    askForCommand();
}

// 清空缓存目录
async function clearCacheDirectory(clothDir = './doc/cloth') {
    try {
        if (await fs.pathExists(clothDir)) {
            await fs.remove(clothDir);
            console.log(chalk.green(`已清空缓存目录: ${clothDir}`));
        }
    } catch (error) {
        console.log(chalk.red(`清空缓存目录失败: ${error.message}`));
        throw error;
    }
}

// 解析命令行参数
function parseArguments() {
    const args = process.argv.slice(2);
    return {
        forceRefresh: args.includes('-f') || args.includes('--force')
    };
}

// 如果直接运行此脚本
if (require.main === module) {
    const options = parseArguments();

    (async () => {
        try {
            // 如果指定了 -f 参数，清空缓存目录
            if (options.forceRefresh) {
                console.log(chalk.yellow('检测到 -f 参数，将清空缓存并重新分析...'));
                await clearCacheDirectory();
            }

            await analyzeItemsGame();
            console.log(chalk.cyan('\n进入交互式CLI模式，输入命令进行操作...'));
            startInteractiveCLI();
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    })();
}

module.exports = {
    analyzeItemsGame,
    buildItemsIndex,
    getItemByName,
    printTreeStructure,
    analyzeDefaultItems,
    analyzeItemSets,
    analyzeItemsByHero,
    generateClothsData,
    itemsIndex
};