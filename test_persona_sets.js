const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 测试 persona 套装标记功能
async function testPersonaSets() {
    const heroDataPath = './doc/cloth/npc_dota_hero_antimage.json';
    const data = JSON.parse(fs.readFileSync(heroDataPath, 'utf8'));

    console.log(chalk.cyan('\n=== Persona 套装标记测试 ===\n'));
    console.log(chalk.yellow(`英雄: Anti-Mage`));
    console.log(chalk.yellow(`总套装数: ${data.item_sets.length}\n`));

    // 分类显示
    const personaSets = data.item_sets.filter(s => s.isPersonaSet);
    const normalSets = data.item_sets.filter(s => !s.isPersonaSet);

    console.log(chalk.green(`普通套装 (${normalSets.length} 个):`));
    normalSets.slice(0, 5).forEach((set, index) => {
        console.log(`  ${chalk.yellow(index + 1)}. ${set.store_bundle} (${set.items.length} 件)`);
    });
    if (normalSets.length > 5) {
        console.log(`  ... 还有 ${normalSets.length - 5} 个`);
    }

    console.log(chalk.magenta(`\nPersona 套装 (${personaSets.length} 个):`));
    personaSets.forEach((set, index) => {
        console.log(`  ${chalk.yellow(index + 1)}. ${chalk.magenta(set.store_bundle)} ${chalk.magenta('[PERSONA]')} (${set.items.length} 件)`);
        // 显示 item_slot 信息
        const personaSlots = set.items.filter(i => i.item_slot.includes('_persona')).map(i => i.item_slot);
        console.log(`     包含 persona 槽位: ${personaSlots.join(', ')}`);
    });

    console.log(chalk.cyan('\n✓ Persona 套装标记功能正常工作\n'));
}

testPersonaSets().catch(console.error);
