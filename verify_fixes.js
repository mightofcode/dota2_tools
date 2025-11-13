const fs = require('fs');
const path = require('path');

// 验证 cloth.js 中的修复
console.log('检查 cloth.js 中的修复...\n');

const clothJsPath = './scripts/cloth.js';
const content = fs.readFileSync(clothJsPath, 'utf8');

const checks = [
    {
        name: 'handleSetCommand 返回 Promise',
        pattern: /return new Promise\(\(resolve\) => \{[\s\S]*?rl\.question\('请输入序号选择套装/,
        found: false
    },
    {
        name: 'selectItemSet 中使用 store_bundle',
        pattern: /selectItemSet[\s\S]*?chalk\.green\(`✓ 已添加套装: \$\{results\[index\]\.store_bundle\}`/,
        found: false
    },
    {
        name: 'handleSetCommand 中单条结果使用 store_bundle',
        pattern: /results\.length === 1[\s\S]*?chalk\.green\(`✓ 已添加套装: \$\{results\[0\]\.store_bundle\}`/,
        found: false
    },
    {
        name: 'displayItemSetList 显示 PERSONA 标签',
        pattern: /displayItemSetList[\s\S]*?set\.isPersonaSet \? chalk\.magenta\(' \[PERSONA\]'\)/,
        found: false
    }
];

checks.forEach(check => {
    check.found = check.pattern.test(content);
    const status = check.found ? '✓' : '✗';
    console.log(`${status} ${check.name}`);
});

console.log('\n验证数据结构...\n');

const heroDataPath = './doc/cloth/npc_dota_hero_antimage.json';
const data = JSON.parse(fs.readFileSync(heroDataPath, 'utf8'));

const firstSet = data.item_sets[0];
const hasPersonaField = 'isPersonaSet' in firstSet;
const hasStoreBundle = 'store_bundle' in firstSet;

console.log(`✓ 套装包含 isPersonaSet 字段: ${hasPersonaField}`);
console.log(`✓ 套装包含 store_bundle 字段: ${hasStoreBundle}`);

// 统计 persona 套装
const personaSets = data.item_sets.filter(s => s.isPersonaSet);
console.log(`✓ 找到 ${personaSets.length} 个 persona 套装`);

console.log('\n所有修复验证完成！');
