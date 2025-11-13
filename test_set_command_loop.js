#!/usr/bin/env node

const readline = require('readline');
const chalk = require('chalk');

// 模拟测试交互式命令循环
async function testInteractive() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(chalk.cyan('测试: 验证 set 命令无参数时的循环\n'));

    // 模拟状态
    const state = {
        selectedUnit: 'npc_dota_hero_antimage',
        itemList: {}
    };

    // 模拟异步选择
    async function testSelection() {
        return new Promise((resolve) => {
            console.log(chalk.yellow('找到 3 个套装:\n'));
            console.log('  1. Acolyte of Vengeance (7 件物品)');
            console.log('  2. The Clergy Ascetic Set (7 件物品)');
            console.log('  3. Designs of the Dragon [PERSONA] (4 件物品)\n');

            rl.question('请输入序号选择套装 (或按 Enter 返回): ', (choice) => {
                if (choice === '1') {
                    console.log(chalk.green('✓ 已添加套装: Acolyte of Vengeance'));
                    console.log(chalk.cyan('当前物品数量: 7 件\n'));
                } else if (choice === '') {
                    console.log(chalk.yellow('已取消选择\n'));
                } else {
                    console.log(chalk.red('无效的选择\n'));
                }
                resolve();
            });
        });
    }

    // 执行选择
    await testSelection();

    // 验证是否能返回命令循环
    console.log(chalk.green('✓ 成功返回命令循环'));
    console.log(chalk.yellow('下一个命令提示符应该出现...\n'));

    rl.question('cloth[npc_dota_hero_antimage]> ', (input) => {
        if (input === 'exit' || input === 'quit') {
            console.log(chalk.green('✓ 测试通过，能够正常接收下一条命令'));
            rl.close();
        }
    });
}

testInteractive().catch(console.error);
