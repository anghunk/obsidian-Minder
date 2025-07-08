import { App, Component, MarkdownRenderer, Menu, MenuItem, setIcon } from "obsidian";
import { MemoItem as MemoItemInterface } from "../types";
import { MemoService } from "../services/memoService";
import { formatDate, getRelativeTimeString } from "../utils/date";

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
        
        this.containerEl = document.createElement('div');
        this.containerEl.className = 'minder-memo-item';
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
            this.containerEl.classList.add('minder-memo-editing');
        } else {
            this.containerEl.classList.remove('minder-memo-editing');
        }
        
        // 笔记头部（时间和操作）
        const headerEl = this.containerEl.createDiv({ cls: 'minder-memo-header' });
        
        // 时间显示
        if (this.showTimestamp) {
            const timeEl = headerEl.createDiv({ cls: 'minder-memo-time' });
            timeEl.setText(getRelativeTimeString(this.memo.createdAt));
            timeEl.setAttribute('title', formatDate(this.memo.createdAt, this.dateFormat));
        }
        
        // 操作按钮
        const actionsEl = headerEl.createDiv({ cls: 'minder-memo-actions' });
        
        // 编辑标记
        if (this.isEditing) {
            const editingBadgeEl = actionsEl.createDiv({ cls: 'minder-memo-editing-badge' });
            editingBadgeEl.setText('编辑中');
        }
        
        // 更多按钮
        const moreButtonEl = actionsEl.createDiv({ cls: 'minder-memo-action-button' });
        setIcon(moreButtonEl, 'more-horizontal');
        moreButtonEl.addEventListener('click', (event) => {
            this.showActionsMenu(moreButtonEl, event);
            event.stopPropagation();
        });
        
        // 内容区域
        const contentEl = this.containerEl.createDiv({ cls: 'minder-memo-content' });
        this.renderContent(contentEl);
        
        // 标签区域
        if (this.memo.tags.length > 0) {
            const tagsEl = this.containerEl.createDiv({ cls: 'minder-memo-tags' });
            
            this.memo.tags.forEach(tag => {
                const tagEl = tagsEl.createSpan({ cls: 'minder-memo-tag' });
                tagEl.setText('#' + tag);
                tagEl.addEventListener('click', (event) => {
                    // 可以在这里添加标签点击回调
                    event.stopPropagation();
                });
            });
        }
        
        // 点击整个笔记项
        this.containerEl.addEventListener('click', () => {
            this.onClickCallback(this.memo);
        });
        
        return this.containerEl;
    }
    
    /**
     * 渲染笔记内容
     * @param containerEl 容器元素
     */
    private renderContent(containerEl: HTMLElement): void {
        containerEl.empty();
        
        try {
            // 使用Obsidian的Markdown渲染器渲染内容，传递组件参数以避免内存泄漏
            if (this.component) {
                MarkdownRenderer.renderMarkdown(
                    this.memo.content, 
                    containerEl, 
                    '', 
                    this.component
                );
            } else {
                // 如果没有有效的组件引用，使用简单的文本渲染
                const contentP = containerEl.createEl('p');
                contentP.textContent = this.memo.content;
            }
        } catch (error) {
            console.error('渲染Markdown内容失败:', error);
            const errorP = containerEl.createEl('p');
            errorP.textContent = this.memo.content;
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
            item.setTitle('编辑')
                .setIcon('pencil')
                .onClick(() => {
                    this.setEditingState(true);
                    this.onEditCallback(this.memo);
                });
        });
        
        // 删除菜单项
        menu.addItem((item) => {
            item.setTitle('删除')
                .setIcon('trash')
                .onClick(() => {
                    this.onDeleteCallback(this.memo);
                });
        });
        
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
                this.containerEl.classList.add('minder-memo-editing');
            } else {
                this.containerEl.classList.remove('minder-memo-editing');
            }
        }
    }
} 