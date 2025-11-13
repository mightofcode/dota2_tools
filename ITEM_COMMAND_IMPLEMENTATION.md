# Item 命令实现总结

## 功能概述

为 `cloth.js` CLI 工具添加了 `item` 命令，用于搜索和添加英雄物品。

## 命令格式

```
item <物品名称>
```

## 核心功能

### 1. 模糊搜索 (line 667-688)
- 函数: `findItemByName(query, items)`
- 按物品 `name` 字段进行模糊搜索
- 排序规则:
  - 优先匹配名称开头的物品
  - 其次按名称长度排序（更接近搜索词的排前面）

### 2. 搜索结果处理

**0 个结果:**
```
未找到匹配 "xxx" 的物品
```

**1 个结果:**
- 直接添加到物品列表
- 如果 item_slot 已存在，删除旧物品后添加新物品

**多个结果:**
- 列出所有结果供用户选择
- 显示物品名称、稀有度、槽位、ID 等信息

### 3. 槽位去重处理 (line 714-726, 763-775)
- 当添加物品时，检查 `item_slot` 是否已存在
- 如果存在，先删除旧物品
- 再添加新物品
- 保证同一槽位只有一个物品

## 实现细节

### 新增函数

1. **findItemByName** (line 667-688)
   - 在物品列表中搜索

2. **displayItemResultsList** (line 690-703)
   - 显示搜索结果列表

3. **selectItem** (line 705-737)
   - 处理用户从多个结果中选择物品

4. **handleItemCommand** (line 740-783)
   - 处理 `item` 命令的主逻辑

### 修改的地方

1. **handleCommand** (line 974-979)
   - 添加 `item` 命令的路由处理

2. **showHelp** (line 990-1001)
   - 更新帮助信息，添加 `item` 命令说明

## 使用示例

### 场景 1: 精确匹配
```
cloth[npc_dota_hero_antimage]> item Acolyte of Vengeance Weapon
✓ 已添加物品: Acolyte of Vengeance Weapon
当前物品数量: 1 件
```

### 场景 2: 模糊搜索
```
cloth[npc_dota_hero_antimage]> item Glaive
找到 5 个匹配的物品:

  1. Glaive of the Mage Slayer (rare)
     槽位: weapon, ID: 15522
  2. Glaives of the Mage Slayer Pack (rare)
     槽位: weapon, ID: 15523
  ...

请输入序号选择物品 (或按 Enter 返回): 1
✓ 已添加物品: Glaive of the Mage Slayer
当前物品数量: 2 件
```

### 场景 3: 槽位重复替换
```
当前: [weapon] Anti-Mage's Glaive
输入: item Glaive of the Mage Slayer

✓ 已添加物品: Glaive of the Mage Slayer
当前物品数量: 1 件
(weapon 槽位的旧物品被替换)
```

## 数据流程

```
用户输入 "item xxx"
    ↓
handleCommand 路由到 handleItemCommand
    ↓
findItemByName 搜索物品
    ↓
根据结果数量:
  - 0个: 显示未找到
  - 1个: 直接添加
  - 多个: selectItem 供用户选择
    ↓
检查 item_slot 冲突
    ↓
删除旧物品 (如果冲突)
    ↓
添加新物品到 itemList
    ↓
显示确认信息和更新后的物品列表
```

## 测试验证

✓ 语法检查通过
✓ 模糊搜索功能正常
✓ 单/多结果处理正确
✓ 槽位去重处理正确
✓ 用户交互流程完整
