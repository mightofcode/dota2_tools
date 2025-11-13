const fs = require('fs');
const chalk = require('chalk');

console.log(chalk.cyan.bold('\n=== Item 命令完整功能演示 ===\n'));

// 加载数据
const data = JSON.parse(fs.readFileSync('./doc/cloth/npc_dota_hero_antimage.json', 'utf8'));

// 显示命令格式
console.log(chalk.yellow('命令格式: item <物品名称>\n'));

// 演示场景 1
console.log(chalk.green('场景 1: 搜索唯一物品\n'));
console.log(chalk.white('输入: item "Acolyte of Vengeance Weapon"\n'));
console.log(chalk.cyan('效果:'));
console.log('✓ 已添加物品: Acolyte of Vengeance Weapon');
console.log('当前物品数量: 1 件\n');

// 演示场景 2
console.log(chalk.green('场景 2: 搜索多个物品，用户选择\n'));
console.log(chalk.white('输入: item "Glaive"\n'));
console.log(chalk.cyan('系统显示:'));
console.log(chalk.cyan('找到 5 个匹配的物品:\n'));
console.log('  1. Glaive of the Mage Slayer (rare)');
console.log('     槽位: weapon, ID: 15522');
console.log('  2. Glaives of the Mage Slayer Pack (rare)');
console.log('     槽位: weapon, ID: 15523');
console.log('  3. Glaive of the Mage Slayer - Off-Hand (rare)');
console.log('     槽位: offhand_weapon, ID: 15524');
console.log('  4. Anti-Mage\'s Glaive (common)');
console.log('     槽位: weapon, ID: 1');
console.log('  5. Anti-Mage\'s Offhand Glaive (common)');
console.log('     槽位: offhand_weapon, ID: 335');

console.log(chalk.white('\n用户输入: 1\n'));
console.log(chalk.cyan('效果:'));
console.log('✓ 已添加物品: Glaive of the Mage Slayer');
console.log('当前物品数量: 2 件');
console.log('(weapon 槽位的旧物品被替换)\n');

// 演示场景 3
console.log(chalk.green('场景 3: 槽位重复时的处理\n'));
console.log(chalk.white('当前物品列表:'));
console.log('  [weapon] Glaive of the Mage Slayer (rare)');
console.log('  [offhand_weapon] Anti-Mage\'s Offhand Glaive (common)\n');

console.log(chalk.white('输入: item "Anti-Mage\'s Glaive"\n'));
console.log(chalk.cyan('效果:'));
console.log('✓ 已添加物品: Anti-Mage\'s Glaive');
console.log('当前物品数量: 2 件');
console.log('(weapon 槽位的旧物品 Glaive of the Mage Slayer 被删除)\n');

console.log(chalk.white('更新后的物品列表:'));
console.log('  [weapon] Anti-Mage\'s Glaive (common)');
console.log('  [offhand_weapon] Anti-Mage\'s Offhand Glaive (common)\n');

// 演示场景 4
console.log(chalk.green('场景 4: 无搜索结果\n'));
console.log(chalk.white('输入: item "xyz_not_found"\n'));
console.log(chalk.cyan('效果:'));
console.log(chalk.red('未找到匹配 "xyz_not_found" 的物品\n'));

// 统计信息
console.log(chalk.yellow('数据统计:'));
console.log(`  - 总物品数: ${data.items.length}`);
console.log(`  - 不同槽位数: ${new Set(data.items.map(i => i.item_slot)).size}`);

const rarities = {};
data.items.forEach(item => {
    rarities[item.item_rarity] = (rarities[item.item_rarity] || 0) + 1;
});
console.log(`  - 稀有度分布:`);
Object.entries(rarities).forEach(([rarity, count]) => {
    console.log(`    ${rarity}: ${count}`);
});

console.log();
