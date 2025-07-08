## Obsidian Minder

Minder 是一个 Obsidian 插件，快速记录灵感、想法和小笔记的插件，支持标签整理和搜索。

### 功能介绍

- 📝 快速记录想法、灵感和笔记
- 🔖 支持标签分类和搜索
- 🔍 按内容搜索笔记
- 🏷️ 标签管理和统计
- 💾 基于 Markdown 文件存储，完全兼容 Obsidian 生态

**使用方式**

> 注：该项目暂未上架 Obsidian 插件商店

1. 从 [GitHub Releases](https://github.com/ezyshu/obsidian-Minder/releases) 页面下载最新版本的以下文件：
   - main.js
   - manifest.json
   - styles.css
2. 在你的 Obsidian 库的 `.obsidian/plugins/` 目录下创建 `obsidian-Minder` 文件夹
3. 将下载的文件放入 `obsidian-Minder` 文件夹中
4. 重启 Obsidian
5. 在设置 > 第三方插件中启用 AI Tags Generator

**或者使用 [BRAT 插件](https://github.com/TfTHacker/obsidian42-brat) 安装：**
1. 安装 BRAT 插件
2. 在 BRAT 设置中添加本插件仓库路径：`ezyshu/obsidian-Minder`
3. 启用 Minder 插件

**视图切换**

- **全部**：显示所有笔记
- **标签**：按标签筛选笔记

**设置选项**

- **笔记存储路径**：指定保存笔记的文件夹路径
- **日期格式**：自定义日期显示格式
- **显示数量**：每个视图显示的笔记数量上限
- **默认排序**：笔记的排序方式

**文件存储**

笔记以 Markdown 文件形式存储在指定的文件夹中，每个笔记文件包含 YAML 前置元数据，记录笔记的 ID、创建时间、更新时间和标签信息。


### 项目结构

```
src/
  ├── components/       # UI组件
  │   ├── MemoView.ts   # 主视图
  │   ├── MemoItem.ts   # 单条笔记组件
  │   ├── MemoEditor.ts # 笔记编辑器
  │   └── TagsBar.ts    # 标签栏组件
  ├── services/         # 服务层
  │   ├── memoService.ts # 笔记数据服务
  │   └── tagService.ts  # 标签管理服务
  ├── utils/            # 工具函数
  │   ├── date.ts       # 日期工具
  │   └── file.ts       # 文件操作工具
  ├── types.ts          # 类型定义
  └── settings.ts       # 设置组件
```

### LINCENSE

[Apache-2.0 license](./LICENSE)
