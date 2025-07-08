import { App, Notice, Plugin, PluginSettingTab, WorkspaceLeaf } from 'obsidian';
import { MinderSettings } from './src/types';
import { DEFAULT_SETTINGS, MinderSettingTab } from './src/settings';
import { MemoView, MEMO_VIEW_TYPE } from './src/components/MemoView';

export default class MinderPlugin extends Plugin {
	settings: MinderSettings;

	async onload() {
		await this.loadSettings();
		
		// 注册视图
		this.registerView(
			MEMO_VIEW_TYPE,
			(leaf) => new MemoView(leaf, this.settings)
		);

		// 在左侧添加图标，使用更能体现小笔记功能的图标
		this.addRibbonIcon('lightbulb', 'Minder 快速笔记', async () => {
			await this.activateView();
		});

		// 添加命令
		this.addCommand({
			id: 'open-minder',
			name: '打开 Minder 笔记视图',
			callback: async () => {
				await this.activateView();
			}
		});
		
		// 添加快速添加笔记的命令
		this.addCommand({
			id: 'add-quick-memo',
			name: '快速添加笔记',
			callback: () => {
				this.activateView().then(() => {
					// 聚焦到编辑器
					const viewLeaf = this.app.workspace.getLeavesOfType(MEMO_VIEW_TYPE)[0];
					if (viewLeaf) {
						const view = viewLeaf.view as MemoView;
						view.focusEditor();
					}
				});
			}
		});

		// 添加设置选项卡
		this.addSettingTab(new MinderSettingTab(this.app, this));
		
	}

	onunload() {
		// 卸载时关闭视图
		this.app.workspace.getLeavesOfType(MEMO_VIEW_TYPE).forEach(leaf => leaf.detach());
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	/**
	 * 激活视图
	 */
	async activateView() {
		const { workspace } = this.app;
		
		// 查找已存在的视图
		let leaf = workspace.getLeavesOfType(MEMO_VIEW_TYPE)[0];
		
		if (!leaf) {
			// 在主区域创建新视图，而不是右侧边栏
			leaf = workspace.getLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: MEMO_VIEW_TYPE,
					active: true
				});
			}
		}
		
		if (leaf) {
			// 聚焦到视图
			workspace.revealLeaf(leaf);
		}
	}
	
}

// 为MemoView添加聚焦编辑器的方法
declare module "./src/components/MemoView" {
    interface MemoView {
        focusEditor(): void;
    }
}
