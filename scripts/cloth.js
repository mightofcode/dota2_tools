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
                prefab: item.prefab
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

async function generateClothsData(defaultItems, itemSets, heroItems) {
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
                    item_rarity: item.item_rarity
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

    // 保存每个英雄的数据
    const savedHeroes = [];
    for (const heroName of allHeroes) {
        const heroData = {
            defaults: heroDefaults[heroName] || {},
            item_sets: itemSets[heroName] || [],
            items: heroItems[heroName] || []
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

        // 生成并保存结果 - 按英雄分别保存
        await generateClothsData(defaultItems, itemSets, heroItems);

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
                used_by_heroes: item.used_by_heroes || {}
            };
            
            defaultItems.push(itemInfo);
        }
    });
    
    console.log(`\n找到 ${defaultItems.length} 个 default_item 物品`);
    
    return defaultItems;
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
                        item_rarity: itemInfo.item_rarity
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
            
            const setInfo = {
                name: setData.name || setName,
                store_bundle: setData.store_bundle,
                portrait_image: setData.portrait_image,
                items: setItems
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

// 交互式CLI模式
async function startInteractiveCLI() {
    const readline = require('readline');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'cloth> '
    });

    rl.prompt();

    rl.on('line', (line) => {
        const command = line.trim();

        if (command) {
            console.log(`收到指令: ${command}`);
        }

        rl.prompt();
    }).on('close', () => {
        console.log(chalk.yellow('\n已退出交互式模式'));
        process.exit(0);
    });
}

// 如果直接运行此脚本
if (require.main === module) {
    analyzeItemsGame()
        .then(() => {
            console.log(chalk.cyan('\n进入交互式CLI模式，输入命令进行操作...'));
            startInteractiveCLI();
        })
        .catch(console.error);
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