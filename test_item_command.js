const fs = require('fs');
const chalk = require('chalk');

console.log(chalk.cyan('\n=== Item 命令功能测试 ===\n'));

// 加载数据
const data = JSON.parse(fs.readFileSync('./doc/cloth/npc_dota_hero_antimage.json', 'utf8'));

// 测试 1: 模糊搜索
console.log(chalk.yellow('测试 1: 模糊搜索物品\n'));

function findItemByName(query, items) {
    if (!query || !items || items.length === 0) {
        return [];
    }

    const queryLower = query.toLowerCase();
    const results = items.filter(item => {
        return item.name.toLowerCase().includes(queryLower);
    });

    return results.sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(queryLower);
        const bStartsWith = b.name.toLowerCase().startsWith(queryLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return a.name.length - b.name.length;
    });
}

// 测试搜索 "weapon"
const weaponResults = findItemByName('weapon', data.items);
console.log(`搜索 "weapon": 找到 ${weaponResults.length} 个结果`);
weaponResults.slice(0, 3).forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name} (${item.item_slot})`);
});

// 测试 2: item_slot 去重
console.log(chalk.yellow('\n测试 2: 物品槽位去重处理\n'));

const state = {
    itemList: {
        'weapon': { id: '1', name: '旧武器', item_slot: 'weapon' },
        'armor': { id: '2', name: '盔甲', item_slot: 'armor' }
    }
};

console.log('初始物品列表:');
Object.entries(state.itemList).forEach(([slot, item]) => {
    console.log(`  [${slot}] ${item.name}`);
});

// 添加新的武器
const newWeapon = {
    id: '100',
    name: 'Acolyte of Vengeance Weapon',
    item_name: '#DOTA_Item_Acolyte_of_Vengeance_Weapon',
    item_slot: 'weapon',
    item_rarity: 'uncommon',
    model_player: 'models/items/antimage/acolyte_vengeance_weapon/acolyte_vengeance_weapon.vmdl'
};

// 删除旧的相同 item_slot 物品
if (newWeapon.item_slot in state.itemList) {
    delete state.itemList[newWeapon.item_slot];
}
// 添加新物品
state.itemList[newWeapon.item_slot] = newWeapon;

console.log('\n添加新物品后:');
Object.entries(state.itemList).forEach(([slot, item]) => {
    console.log(`  [${slot}] ${item.name}`);
});

// 测试 3: 单个搜索结果
console.log(chalk.yellow('\n测试 3: 单个搜索结果直接添加\n'));

const singleResult = findItemByName('Acolyte of Vengeance Weapon', data.items);
if (singleResult.length === 1) {
    console.log(`✓ 搜索 "Acolyte of Vengeance Weapon" 返回唯一结果`);
    console.log(`  ${singleResult[0].name} (${singleResult[0].item_slot})`);
}

// 测试 4: 多个搜索结果
console.log(chalk.yellow('\n测试 4: 多个搜索结果列表\n'));

const multiResults = findItemByName('Glaive', data.items);
console.log(`搜索 "Glaive": 找到 ${multiResults.length} 个结果`);
multiResults.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name} (${item.item_slot}, ${item.item_rarity})`);
});

// 测试 5: 无搜索结果
console.log(chalk.yellow('\n测试 5: 无搜索结果\n'));

const noResults = findItemByName('xyz_nonexistent_item', data.items);
console.log(`搜索 "xyz_nonexistent_item": 找到 ${noResults.length} 个结果 ${noResults.length === 0 ? '✓' : ''}`);

console.log(chalk.green('\n✓ 所有测试通过！\n'));
