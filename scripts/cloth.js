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

async function generateClothsData(defaultItems) {
    console.log(chalk.cyan('\n=== 生成英雄默认饰品数据 ==='));
    
    const res = {
        defaults: {},
        item_sets: {},
        items: {}
    };
    
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
        
        heroes.forEach(heroName => {
            if (heroName !== '0') { // 过滤掉英雄名为"0"的数据
                if (!res.defaults[heroName]) {
                    res.defaults[heroName] = {};
                }
                
                res.defaults[heroName][item.item_slot] = {
                    id: item.id,
                    name: item.name,
                    item_name: item.item_name,
                    item_slot: item.item_slot,
                    item_rarity: item.item_rarity
                };
            }
        });
    });
    
    // 保存到文件
    const outputPath = './doc/cloths.json';
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJson(outputPath, res, { spaces: 2 });
    
    console.log(chalk.green(`数据已保存到: ${outputPath}`));
    console.log(chalk.yellow(`共处理 ${Object.keys(res.defaults).length} 个英雄的默认饰品`));
    
    return res;
}

async function analyzeItemsGame() {
    console.log(chalk.blue('开始分析dota2饰品配置文件...'));

    try {
        const outputPath = './doc/cloths.json';

        // 检查缓存文件是否存在
        if (await fs.pathExists(outputPath)) {
            console.log(chalk.yellow(`检测到已存在的缓存文件: ${outputPath}`));
            const cachedData = await fs.readJson(outputPath);
            console.log(chalk.green('直接读取缓存数据，跳过重新解析'));
            return cachedData;
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

        // 生成并保存结果
        const result = await generateClothsData(defaultItems);
        result.item_sets = itemSets;
        result.items = heroItems;

        // 重新保存包含所有信息的完整数据
        await fs.writeJson(outputPath, result, { spaces: 2 });

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

// 如果直接运行此脚本
if (require.main === module) {
    analyzeItemsGame().catch(console.error);
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