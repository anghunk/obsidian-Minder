import {
	App,
	Component,
	MarkdownRenderer,
	Menu,
	MenuItem,
	Modal,
	Notice,
	setIcon,
	TextAreaComponent,
} from "obsidian";
import { MemoItem as MemoItemInterface } from "../types";
import { MemoService } from "../services/memoService";
import { formatDate, getRelativeTimeString } from "../utils/date";
import { extractTagsFromContent } from "../utils/file";

export interface MemoItemComponentOptions {
	app: App;
	memo: MemoItemInterface;
	memoService: MemoService;
	dateFormat: string;
	showTimestamp: boolean;
	onEdit?: (memo: MemoItemInterface) => void;
	onDelete?: (memo: MemoItemInterface) => void;
	onClick?: (memo: MemoItemInterface) => void;
	component?: Component; // 用于Markdown渲染的组件引用
}

export class MemoItemComponent {
	private app: App;
	private memo: MemoItemInterface;
	private memoService: MemoService;
	private containerEl: HTMLElement;
	private dateFormat: string;
	private showTimestamp: boolean;
	private onEditCallback: (memo: MemoItemInterface) => void;
	private onDeleteCallback: (memo: MemoItemInterface) => void;
	private onClickCallback: (memo: MemoItemInterface) => void;
	private component: Component | null;
	private isEditing: boolean;
	private textArea: TextAreaComponent | null = null;
	private contentEl: HTMLElement | null = null;
	private editButtonsEl: HTMLElement | null = null;

	constructor(options: MemoItemComponentOptions) {
		this.app = options.app;
		this.memo = options.memo;
		this.memoService = options.memoService;
		this.dateFormat = options.dateFormat;
		this.showTimestamp = options.showTimestamp;
		this.onEditCallback = options.onEdit || (() => {});
		this.onDeleteCallback = options.onDelete || (() => {});
		this.onClickCallback = options.onClick || (() => {});
		this.component = options.component || null;
		this.isEditing = false;

		this.containerEl = document.createElement("div");
		this.containerEl.className = "minder-memo-item";
		this.containerEl.dataset.id = this.memo.id;
	}

	/**
	 * 渲染笔记项
	 * @param parentEl 父元素
	 * @returns 笔记项元素
	 */
	render(parentEl: HTMLElement): HTMLElement {
		this.containerEl.empty();
		parentEl.appendChild(this.containerEl);

		// 添加编辑中的样式
		if (this.isEditing) {
			this.containerEl.classList.add("minder-memo-editing");
		} else {
			this.containerEl.classList.remove("minder-memo-editing");
		}

		// 笔记头部（时间和操作）
		const headerEl = this.containerEl.createDiv({
			cls: "minder-memo-header",
		});

		// 时间显示
		if (this.showTimestamp) {
			const timeEl = headerEl.createDiv({ cls: "minder-memo-time" });
			timeEl.setText(getRelativeTimeString(this.memo.createdAt));
			timeEl.setAttribute(
				"title",
				formatDate(this.memo.createdAt, this.dateFormat)
			);
		}

		// 操作按钮
		const actionsEl = headerEl.createDiv({ cls: "minder-memo-actions" });

		// 更多按钮
		const moreButtonEl = actionsEl.createDiv({
			cls: "minder-memo-action-button",
		});
		setIcon(moreButtonEl, "more-horizontal");
		moreButtonEl.addEventListener("click", (event) => {
			this.showActionsMenu(moreButtonEl, event);
			event.stopPropagation();
		});

		// 内容区域
		this.contentEl = this.containerEl.createDiv({
			cls: "minder-memo-content",
		});
		
		// 根据编辑状态渲染不同的内容
		if (this.isEditing) {
			this.renderEditView(this.contentEl);
		} else {
			this.renderReadView(this.contentEl);
		}

		// 标签区域
		if (this.memo.tags.length > 0 && !this.isEditing) {
			const tagsEl = this.containerEl.createDiv({
				cls: "minder-memo-tags",
			});

			this.memo.tags.forEach((tag) => {
				const tagEl = tagsEl.createSpan({ cls: "minder-memo-tag" });
				tagEl.setText("#" + tag);
				tagEl.addEventListener("click", (event) => {
					// 可以在这里添加标签点击回调
					event.stopPropagation();
				});
			});
		}

		// 只有在非编辑模式下才添加点击和双击事件
		if (!this.isEditing) {
			// 点击整个笔记项
			this.containerEl.addEventListener("click", () => {
				if (!this.isEditing) {
					this.onClickCallback(this.memo);
				}
			});

			// 添加双击事件监听器，切换到编辑模式
			this.containerEl.addEventListener("dblclick", (event) => {
				if (!this.isEditing) {
					this.setEditingState(true);
					event.stopPropagation();
				}
			});
		}

		return this.containerEl;
	}

	/**
	 * 渲染阅读视图
	 * @param containerEl 容器元素
	 */
	private renderReadView(containerEl: HTMLElement): void {
		containerEl.empty();

		try {
			// 使用Obsidian的Markdown渲染器渲染内容，传递组件参数以避免内存泄漏
			if (this.component) {
				MarkdownRenderer.renderMarkdown(
					this.memo.content,
					containerEl,
					"",
					this.component
				);
			} else {
				// 如果没有有效的组件引用，使用简单的文本渲染
				const contentP = containerEl.createEl("p");
				contentP.textContent = this.memo.content;
			}
		} catch (error) {
			console.error("渲染Markdown内容失败:", error);
			const errorP = containerEl.createEl("p");
			errorP.textContent = this.memo.content;
		}
	}

	/**
	 * 渲染编辑视图
	 * @param containerEl 容器元素
	 */
	private renderEditView(containerEl: HTMLElement): void {
		containerEl.empty();

		// 创建文本区域
		const textAreaContainer = containerEl.createDiv({ cls: "minder-memo-edit-container" });
		this.textArea = new TextAreaComponent(textAreaContainer);
		this.textArea
			.setPlaceholder("输入笔记内容...")
			.setValue(this.memo.content)
			.onChange(() => this.previewTags());
		
		this.textArea.inputEl.className = "minder-memo-edit-textarea";
		this.textArea.inputEl.style.width = "100%";
		this.textArea.inputEl.style.height = "auto";
		this.textArea.inputEl.style.minHeight = "50px";
		this.textArea.inputEl.focus();
		
		// 设置自动调整高度
		this.setupAutoResize(this.textArea.inputEl);

		// 标签预览区域
		const tagPreviewEl = containerEl.createDiv({ cls: "minder-tag-preview" });
		
		// 编辑按钮区域
		this.editButtonsEl = containerEl.createDiv({ cls: "minder-memo-edit-buttons" });
		
		// 取消按钮
		const cancelButton = this.editButtonsEl.createEl("button", { 
			cls: "minder-memo-edit-button minder-memo-cancel-button",
			text: "取消"
		});
		cancelButton.addEventListener("click", (e) => {
			this.setEditingState(false);
			e.stopPropagation();
		});
		
		// 保存按钮
		const saveButton = this.editButtonsEl.createEl("button", { 
			cls: "minder-memo-edit-button minder-memo-save-button",
			text: "保存"
		});
		saveButton.addEventListener("click", (e) => {
			this.saveMemo();
			e.stopPropagation();
		});

		// 初始化标签预览
		this.previewTags(tagPreviewEl);
	}

	/**
	 * 设置文本区域自动调整高度
	 * @param textArea 文本区域元素
	 */
	private setupAutoResize(textArea: HTMLTextAreaElement): void {
		// 初始调整高度
		this.adjustTextAreaHeight(textArea);
		
		// 监听输入事件
		textArea.addEventListener('input', () => {
			this.adjustTextAreaHeight(textArea);
		});
		
		// 监听窗口大小变化
		window.addEventListener('resize', () => {
			this.adjustTextAreaHeight(textArea);
		});
	}
	
	/**
	 * 调整文本区域高度以适应内容
	 * @param textArea 文本区域元素
	 */
	private adjustTextAreaHeight(textArea: HTMLTextAreaElement): void {
		// 重置高度，以便正确计算新高度
		textArea.style.height = 'auto';
		
		// 设置高度为滚动高度
		textArea.style.height = textArea.scrollHeight + 'px';
	}

	/**
	 * 预览标签
	 */
	private previewTags(tagPreviewEl?: HTMLElement): void {
		if (!this.textArea) return;
		
		const previewEl = tagPreviewEl || this.containerEl.querySelector(".minder-tag-preview");
		if (!previewEl) return;
		
		previewEl.empty();
		const content = this.textArea.getValue();
		const tags = extractTagsFromContent(content);
		
		if (tags.length > 0) {
			previewEl.createSpan({ text: '标签: ' });
			
			tags.forEach(tag => {
				const tagEl = previewEl.createSpan({ cls: 'minder-tag-preview-item' });
				tagEl.setText(tag);
			});
		}
	}

	/**
	 * 保存笔记
	 */
	private async saveMemo(): Promise<void> {
		if (!this.textArea) return;
		
		const content = this.textArea.getValue();
		if (!content.trim()) {
			new Notice("笔记内容不能为空");
			return;
		}
		
		try {
			const updatedMemo = await this.memoService.updateMemo(this.memo.id, content);
			if (updatedMemo) {
				this.memo = updatedMemo;
				this.setEditingState(false);
				new Notice("笔记已保存");
			} else {
				throw new Error("更新笔记失败");
			}
		} catch (error) {
			console.error("保存笔记失败:", error);
			new Notice("保存笔记失败");
		}
	}

	/**
	 * 显示操作菜单
	 * @param targetEl 触发菜单的元素
	 * @param event 事件对象
	 */
	private showActionsMenu(targetEl: HTMLElement, event: MouseEvent): void {
		const menu = new Menu();

		// 编辑菜单项
		menu.addItem((item) => {
			item.setTitle("编辑")
				.setIcon("pencil")
				.onClick(() => {
					this.setEditingState(true);
				});
		});

		// 删除菜单项
		menu.addItem((item) => {
			const itemDom = item.setTitle("删除")
				.setIcon("trash")
				.onClick(() => {
					// 显示删除确认对话框
					this.showDeleteConfirmation();
				});
			
			// 设置删除文字为红色
			const titleEl = (itemDom as any).titleEl;
			if (titleEl) {
				titleEl.style.color = "var(--text-error)";
			}
			
			// 设置删除图标为红色
			const iconEl = (itemDom as any).iconEl;
			if (iconEl) {
				iconEl.style.color = "var(--text-error)";
			}
		});

		// 进入源文件菜单项
		if (this.memo.linkedFile) {
			menu.addItem((item) => {
				item.setTitle("进入源文件")
					.setIcon("file-text")
					.onClick(() => {
						this.app.workspace
							.getLeaf()
							.openFile(this.memo.linkedFile!);
					});
			});
		}

		menu.showAtMouseEvent(event);
	}

	/**
	 * 更新笔记数据
	 * @param memo 新的笔记数据
	 */
	update(memo: MemoItemInterface): void {
		this.memo = memo;

		if (this.containerEl.parentElement) {
			this.render(this.containerEl.parentElement);
		}
	}

	/**
	 * 设置编辑状态
	 * @param isEditing 是否正在编辑
	 */
	setEditingState(isEditing: boolean): void {
		this.isEditing = isEditing;

		if (this.containerEl) {
			if (isEditing) {
				this.containerEl.classList.add("minder-memo-editing");
			} else {
				this.containerEl.classList.remove("minder-memo-editing");
			}
			
			// 如果有父元素，重新渲染
			if (this.containerEl.parentElement) {
				this.render(this.containerEl.parentElement);
			}
		}
		
		// 如果进入编辑状态，通知外部回调（用于同步状态）
		if (isEditing) {
			this.onEditCallback(this.memo);
		}
	}
	
	/**
	 * 显示删除确认对话框
	 */
	private showDeleteConfirmation(): void {
		// 创建确认对话框
		const confirmModal = new Modal(this.app);
		confirmModal.titleEl.setText("确认删除");
		
		// 设置对话框内容
		const contentEl = confirmModal.contentEl;
		contentEl.empty();
		
		const messageEl = contentEl.createDiv();
		messageEl.setText("确定要删除这条笔记吗？此操作不可撤销。");
		messageEl.style.marginBottom = "20px";
		
		// 添加预览内容
		const previewEl = contentEl.createDiv({ cls: "minder-delete-preview" });
		previewEl.style.padding = "10px";
		previewEl.style.background = "var(--background-secondary)";
		previewEl.style.borderRadius = "5px";
		previewEl.style.marginBottom = "20px";
		previewEl.style.maxHeight = "100px";
		previewEl.style.overflow = "auto";
		
		// 截取内容的前50个字符作为预览
		const previewContent = this.memo.content.length > 50 
			? this.memo.content.substring(0, 50) + "..." 
			: this.memo.content;
		
		previewEl.setText(previewContent);
		
		// 按钮容器
		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";
		
		// 取消按钮
		const cancelButton = buttonContainer.createEl("button");
		cancelButton.setText("取消");
		cancelButton.addEventListener("click", () => {
			confirmModal.close();
		});
		
		// 确认删除按钮
		const confirmButton = buttonContainer.createEl("button");
		confirmButton.setText("删除");
		confirmButton.classList.add("mod-warning");
		confirmButton.addEventListener("click", () => {
			this.onDeleteCallback(this.memo);
			confirmModal.close();
		});
		
		// 打开对话框
		confirmModal.open();
	}
}
