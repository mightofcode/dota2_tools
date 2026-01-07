const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const { parse } = require('./lib/kv3parser');
const { obj2kv1, objToNpcKv } = require('./lib/obj2kv1');

// 配置文件路径
const npcHeroesPath = 'C:/data/dota2unpack/scripts/npc/npc_heroes.txt';
const npcUnitsPath = 'C:/data/dota2unpack/scripts/npc/npc_units.txt';

// 全局数据
let heroesData = {};
let unitsData = {};

// 加载英雄数据
async function loadHeroesData() {
    console.log(chalk.cyan('正在加载英雄数据...'));

    if (!await fs.pathExists(npcHeroesPath)) {
        throw new Error(`英雄文件不存在: ${npcHeroesPath}`);
    }

    const fileContent = await fs.readFile(npcHeroesPath, 'utf-8');
    const parsedData = parse(fileContent);

    // npc_heroes.txt 的结构通常是 DOTAHeroes -> { hero_name: {...} }
    const heroesRoot = parsedData.DOTAHeroes || parsedData;

    heroesData = heroesRoot;

    console.log(chalk.green(`✓ 成功加载 ${Object.keys(heroesData).length} 个英雄定义\n`));
    return heroesData;
}

// 加载单位数据
async function loadUnitsData() {
    console.log(chalk.cyan('正在加载单位数据...'));

    if (!await fs.pathExists(npcUnitsPath)) {
        throw new Error(`单位文件不存在: ${npcUnitsPath}`);
    }

    const fileContent = await fs.readFile(npcUnitsPath, 'utf-8');
    const parsedData = parse(fileContent);

    // npc_units.txt 的结构通常是 DOTAUnits -> { unit_name: {...} }
    const unitsRoot = parsedData.DOTAUnits || parsedData;

    unitsData = unitsRoot;

    console.log(chalk.green(`✓ 成功加载 ${Object.keys(unitsData).length} 个单位定义\n`));
    return unitsData;
}

// 打印英雄和单位 ID
function printIds() {
    console.log(chalk.yellow('\n=== 英雄列表 ==='));
    const heroIds = Object.keys(heroesData).filter(key => key !== 'Version' && key !== 'npc_dota_hero_base');
    heroIds.forEach((heroId, index) => {
        if ((index + 1) % 3 === 0) {
            console.log(chalk.white(heroId));
        } else {
            process.stdout.write(chalk.white(heroId.padEnd(35)));
        }
    });
    console.log('\n');
    console.log(chalk.green(`总计: ${heroIds.length} 个英雄\n`));

    console.log(chalk.yellow('=== 单位列表 ==='));
    const unitIds = Object.keys(unitsData).filter(key => key !== 'Version' && key !== 'npc_dota_unit_base');
    unitIds.forEach((unitId, index) => {
        if ((index + 1) % 3 === 0) {
            console.log(chalk.white(unitId));
        } else {
            process.stdout.write(chalk.white(unitId.padEnd(35)));
        }
    });
    console.log('\n');
    console.log(chalk.green(`总计: ${unitIds.length} 个单位\n`));
}

// 主函数
async function main() {
    console.log(chalk.green('=== Dota 2 单位 KV 生成器 ===\n'));

    // 加载数据
    await loadHeroesData();
    await loadUnitsData();

    // 打印 ID 列表
    printIds();

    // TODO: 启动交互式命令行
}

// 检查是否直接运行此脚本
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('错误:'), error.message);
        process.exit(1);
    });
}

module.exports = {
    // TODO: 导出函数
};
