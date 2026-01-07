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

// ============== 搜索和匹配功能 ==============

// 检查英雄别名匹配（完全匹配）
function checkHeroAlias(query) {
    const queryLower = query.toLowerCase().trim();

    for (const [heroId, heroData] of Object.entries(heroesData)) {
        if (heroId === 'Version' || heroId === 'npc_dota_hero_base') continue;

        // 检查是否有 NameAliases 字段
        if (heroData.NameAliases) {
            const aliases = heroData.NameAliases.split(';').map(alias => alias.trim().toLowerCase());
            // 完全匹配别名
            if (aliases.includes(queryLower)) {
                return { type: 'hero', id: heroId, data: heroData };
            }
        }
    }

    return null;
}

// 通过名字模糊搜索（搜索 KV key）
function fuzzySearchByName(query) {
    if (!query) return [];

    const queryLower = query.toLowerCase();
    const results = [];

    // 搜索英雄
    for (const [heroId, heroData] of Object.entries(heroesData)) {
        if (heroId === 'Version' || heroId === 'npc_dota_hero_base') continue;

        if (heroId.toLowerCase().includes(queryLower)) {
            results.push({
                type: 'hero',
                id: heroId,
                data: heroData
            });
        }
    }

    // 搜索单位
    for (const [unitId, unitData] of Object.entries(unitsData)) {
        if (unitId === 'Version' || unitId === 'npc_dota_unit_base' || unitId === 'npc_dota_units_base') continue;

        if (unitId.toLowerCase().includes(queryLower)) {
            results.push({
                type: 'unit',
                id: unitId,
                data: unitData
            });
        }
    }

    // 排序：优先前缀匹配，然后按长度排序
    return results.sort((a, b) => {
        const aStartsWith = a.id.toLowerCase().startsWith(queryLower);
        const bStartsWith = b.id.toLowerCase().startsWith(queryLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return a.id.length - b.id.length;
    }).slice(0, 10); // 最多返回前10个
}

// 通过模型模糊搜索（搜索 Model 字段）
function fuzzySearchByModel(query) {
    if (!query) return [];

    const queryLower = query.toLowerCase();
    const results = [];

    // 搜索英雄的模型
    for (const [heroId, heroData] of Object.entries(heroesData)) {
        if (heroId === 'Version' || heroId === 'npc_dota_hero_base') continue;

        const model = heroData.Model || '';
        if (model.toLowerCase().includes(queryLower)) {
            results.push({
                type: 'hero',
                id: heroId,
                data: heroData,
                model: model
            });
        }
    }

    // 搜索单位的模型
    for (const [unitId, unitData] of Object.entries(unitsData)) {
        if (unitId === 'Version' || unitId === 'npc_dota_unit_base' || unitId === 'npc_dota_units_base') continue;

        const model = unitData.Model || '';
        if (model.toLowerCase().includes(queryLower)) {
            results.push({
                type: 'unit',
                id: unitId,
                data: unitData,
                model: model
            });
        }
    }

    // 排序：优先前缀匹配，然后按长度排序
    return results.sort((a, b) => {
        const aStartsWith = (a.model || '').toLowerCase().startsWith(queryLower);
        const bStartsWith = (b.model || '').toLowerCase().startsWith(queryLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return (a.model || '').length - (b.model || '').length;
    }).slice(0, 10); // 最多返回前10个
}

// ============== 交互式界面功能 ==============

// 显示单位候选列表
function displayUnitCandidates(results) {
    console.log(chalk.cyan(`\n找到 ${results.length} 个匹配结果:\n`));
    results.forEach((result, index) => {
        const typeLabel = result.type === 'hero' ? chalk.green('[英雄]') : chalk.blue('[单位]');
        const model = result.model ? chalk.gray(` (${result.model})`) : '';
        console.log(`  ${chalk.yellow(index + 1)}. ${typeLabel} ${result.id}${model}`);
    });
    console.log();
}

// 选择单位的交互
async function selectUnitFromCandidates(rl, results, state) {
    return new Promise((resolve) => {
        displayUnitCandidates(results);

        rl.question('请输入序号选择单位 (或按 Enter 返回): ', (choice) => {
            const index = parseInt(choice) - 1;
            if (index >= 0 && index < results.length) {
                const selected = results[index];
                selectUnit(selected, state);
            } else if (choice === '') {
                console.log(chalk.yellow('已取消选择'));
            } else {
                console.log(chalk.red('无效的选择'));
            }
            resolve();
        });
    });
}

// 选择单位（设置当前状态）
function selectUnit(unitInfo, state) {
    state.selectedUnit = unitInfo;
    console.log(chalk.green(`\n✓ 已选择 ${unitInfo.type === 'hero' ? '英雄' : '单位'}: ${unitInfo.id}`));

    // 显示单位详细信息
    console.log(chalk.cyan('\n单位信息:'));
    const data = unitInfo.data;

    if (data.Model) {
        console.log(chalk.white(`  模型: ${data.Model}`));
    }
    if (data.BaseClass) {
        console.log(chalk.white(`  基类: ${data.BaseClass}`));
    }
    if (unitInfo.type === 'hero' && data.NameAliases) {
        console.log(chalk.white(`  别名: ${data.NameAliases}`));
    }
    console.log();
}

// 处理 name 命令（通过名字搜索）
async function handleNameCommand(query, state, rl) {
    if (!query) {
        console.log(chalk.red('请输入要搜索的名字'));
        return;
    }

    // 首先检查英雄别名（完全匹配）
    const aliasMatch = checkHeroAlias(query);
    if (aliasMatch) {
        selectUnit(aliasMatch, state);
        return;
    }

    // 进行模糊搜索
    const results = fuzzySearchByName(query);

    if (results.length === 0) {
        console.log(chalk.red(`未找到匹配 "${query}" 的单位`));
    } else if (results.length === 1) {
        selectUnit(results[0], state);
    } else {
        await selectUnitFromCandidates(rl, results, state);
    }
}

// 处理 model 命令（通过模型搜索）
async function handleModelCommand(query, state, rl) {
    if (!query) {
        console.log(chalk.red('请输入要搜索的模型路径'));
        return;
    }

    // 进行模糊搜索
    const results = fuzzySearchByModel(query);

    if (results.length === 0) {
        console.log(chalk.red(`未找到匹配 "${query}" 的模型`));
    } else if (results.length === 1) {
        selectUnit(results[0], state);
    } else {
        await selectUnitFromCandidates(rl, results, state);
    }
}

// 处理 status 命令
function handleStatusCommand(state) {
    if (!state.selectedUnit) {
        console.log(chalk.yellow('尚未选择单位'));
        return;
    }

    console.log(chalk.cyan('\n当前状态:'));
    const unitInfo = state.selectedUnit;
    console.log(chalk.white(`  类型: ${unitInfo.type === 'hero' ? '英雄' : '单位'}`));
    console.log(chalk.white(`  ID: ${unitInfo.id}`));
    if (unitInfo.data.Model) {
        console.log(chalk.white(`  模型: ${unitInfo.data.Model}`));
    }
    console.log();
}

// 处理 clear 命令
function handleClearCommand(state) {
    state.selectedUnit = null;
    console.log(chalk.green('✓ 已清空状态'));
}

// 处理 exit 命令
function handleExitCommand() {
    console.log(chalk.green('\n再见!'));
    process.exit(0);
}

// 构建单位数据（只保留需要的字段）
function buildUnitData(originalData) {
    const result = {};

    // 1. 模型相关
    if (originalData.Model) {
        result.Model = originalData.Model;
    }
    if (originalData.SoundSet) {
        result.SoundSet = originalData.SoundSet;
    }
    if (originalData.ModelScale !== undefined) {
        result.ModelScale = originalData.ModelScale;
    }

    // 2. BaseClass
    result.BaseClass = "npc_dota_creature";

    // 3. 能力
    result.Ability1 = "sell_building";
    result.Ability2 = "";
    result.Ability3 = "";
    result.Ability4 = "";

    // 4. 护甲和攻击
    result.ArmorPhysical = 3;
    if (originalData.AttackCapabilities) {
        result.AttackCapabilities = originalData.AttackCapabilities;
    }
    result.AttackDamageMin = 10;
    result.AttackDamageMax = 12;
    result.AttackDamageType = "DAMAGE_TYPE_ArmorPhysical";
    if (originalData.AttackRate !== undefined) {
        result.AttackRate = originalData.AttackRate;
    }
    if (originalData.AttackAnimationPoint !== undefined) {
        result.AttackAnimationPoint = originalData.AttackAnimationPoint;
    }
    result.AttackAcquisitionRange = 800;
    if (originalData.AttackRange !== undefined) {
        result.AttackRange = originalData.AttackRange;
    }
    result.AttackRangeBuffer = 250;

    // 投射物
    if (originalData.ProjectileModel) {
        result.ProjectileModel = originalData.ProjectileModel;
    }
    if (originalData.ProjectileSpeed !== undefined) {
        result.ProjectileSpeed = originalData.ProjectileSpeed;
    }

    // 攻击速度修饰符
    if (originalData.AttackSpeedActivityModifiers) {
        result.AttackSpeedActivityModifiers = originalData.AttackSpeedActivityModifiers;
    }

    // 5. 属性和状态
    result.MagicalResistance = 0;
    result.StatusHealth = 500;
    result.StatusHealthRegen = 0;
    result.StatusMana = 0;
    result.StatusManaRegen = 0;
    if (originalData.HealthBarOffset !== undefined) {
        result.HealthBarOffset = originalData.HealthBarOffset;
    }

    // 6. 移动
    if (originalData.MovementSpeed !== undefined) {
        result.MovementSpeed = originalData.MovementSpeed;
    }
    if (originalData.MovementTurnRate !== undefined) {
        result.MovementTurnRate = originalData.MovementTurnRate;
    } else {
        result.MovementTurnRate = 0.6;
    }
    if (originalData.MovementSpeedActivityModifiers) {
        result.MovementSpeedActivityModifiers = originalData.MovementSpeedActivityModifiers;
    }
    result.MovementCapabilities = "DOTA_UNIT_CAP_MOVE_GROUND";

    // 7. 攻击范围修饰符
    if (originalData.AttackRangeActivityModifiers) {
        result.AttackRangeActivityModifiers = originalData.AttackRangeActivityModifiers;
    }

    // 8. 经济
    result.BountyXP = 0;
    result.BountyGoldMin = 0;
    result.BountyGoldMax = 0;

    // 9. 碰撞和大小
    result.BoundsHullName = "DOTA_HULL_SIZE_HERO";
    if (originalData.RingRadius !== undefined) {
        result.RingRadius = originalData.RingRadius;
    } else {
        result.RingRadius = 70;
    }
    result.ConstructionSize = 2;
    result.BlockPathingSize = 0;

    // 10. 战斗类型
    result.CombatClassAttack = "DOTA_COMBAT_CLASS_ATTACK_BASIC";
    result.CombatClassDefend = "DOTA_COMBAT_CLASS_DEFEND_BASIC";

    // 11. 其他属性
    result.BaseAttackSpeed = 100;
    result.VisionDaytimeRange = 1800;
    result.VisionNighttimeRange = 800;
    if (originalData.HasAggressiveStance !== undefined) {
        result.HasAggressiveStance = originalData.HasAggressiveStance;
    }

    // 12. 特殊标志
    result.DisableTurning = 1;
    result.Disarmed = 1;
    result.noHealthBar = 1;
    result.OverrideBuildingGhost = "building_ghost";

    // 13. Creature 数据
    result.Creature = { HPGain: 0, DamageGain: 0 };

    return result;
}

// 处理 dump 命令（生成 KV 文件）
async function handleDumpCommand(state) {
    if (!state.selectedUnit) {
        console.log(chalk.red('请先选择一个单位'));
        return;
    }

    const unitInfo = state.selectedUnit;
    const unitId = unitInfo.id;
    const processedData = buildUnitData(unitInfo.data);

    // 构建完整的 KV 结构（带单位 ID 作为 key）
    const fullData = {
        [unitId]: processedData
    };

    const kvOutput = objToNpcKv(fullData);

    // 确保 tmp 目录存在
    await fs.ensureDir('./tmp');

    // 写入文件
    const outputPath = './tmp/unit_kv.kv';
    await fs.writeFile(outputPath, kvOutput, 'utf-8');

    console.log(chalk.cyan('\n生成的 KV 格式:\n'));
    console.log(chalk.white(kvOutput));
    console.log(chalk.green(`\n✓ 已保存到: ${outputPath}`));

    // 使用 VS Code 打开文件
    const { exec } = require('child_process');
    const absolutePath = path.resolve(outputPath);

    exec(`code "${absolutePath}"`, (error) => {
        if (error) {
            console.log(chalk.yellow('\n无法自动打开 VS Code，请手动打开文件'));
        } else {
            console.log(chalk.green('✓ 已在 VS Code 中打开文件'));
        }
    });
}

// 显示帮助信息
function showHelp() {
    console.log(chalk.cyan('进入交互式 CLI 模式'));
    console.log(chalk.yellow('\n命令列表:'));
    console.log(chalk.yellow('  name <名字>   - 通过名字搜索单位（支持别名和模糊搜索）'));
    console.log(chalk.yellow('  model <模型>  - 通过模型路径搜索单位'));
    console.log(chalk.yellow('  status        - 显示当前选择的单位'));
    console.log(chalk.yellow('  dump          - 导出当前单位为 KV 格式'));
    console.log(chalk.yellow('  clear         - 清空当前选择'));
    console.log(chalk.yellow('  exit/quit     - 退出程序\n'));
}

// 处理用户命令
async function handleCommand(command, state, rl) {
    if (!command) {
        return;
    }

    const tokens = command.trim().split(/\s+/).filter(token => token.length > 0);
    if (tokens.length === 0) {
        return;
    }

    const cmd = tokens[0];
    const args = tokens.slice(1).join(' ');

    // 内置命令
    if (cmd === 'name') {
        await handleNameCommand(args, state, rl);
        return;
    }

    if (cmd === 'model') {
        await handleModelCommand(args, state, rl);
        return;
    }

    if (cmd === 'status') {
        handleStatusCommand(state);
        return;
    }

    if (cmd === 'dump') {
        await handleDumpCommand(state);
        return;
    }

    if (cmd === 'clear') {
        handleClearCommand(state);
        return;
    }

    if (cmd === 'exit' || cmd === 'quit') {
        handleExitCommand();
        return;
    }

    console.log(chalk.red(`未知命令: ${cmd}`));
    console.log(chalk.yellow('输入命令或使用以下命令:'));
    console.log(chalk.yellow('  name <名字> - 通过名字搜索'));
    console.log(chalk.yellow('  model <模型> - 通过模型搜索'));
}

// 启动交互式 CLI
async function startInteractiveCLI() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // 状态管理
    const state = {
        selectedUnit: null
    };

    showHelp();

    // 交互式命令循环
    const askForCommand = async () => {
        const prompt = state.selectedUnit
            ? `unit[${chalk.green(state.selectedUnit.id)}]> `
            : 'unit> ';

        rl.question(prompt, async (input) => {
            const command = input.trim();
            await handleCommand(command, state, rl);
            askForCommand();
        });
    };

    askForCommand();
}

// 主函数
async function main() {
    console.log(chalk.green('=== Dota 2 单位 KV 生成器 ===\n'));

    // 加载数据
    await loadHeroesData();
    await loadUnitsData();

    // 打印 ID 列表
    printIds();

    // 启动交互式命令行
    await startInteractiveCLI();
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
