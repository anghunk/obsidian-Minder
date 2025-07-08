import { App, setIcon } from "obsidian";
import { TagService, TagWithCount } from "../services/tagService";

export interface TagsBarOptions {
    app: App;
    tagService: TagService;
    onTagClick?: (tagName: string) => void;
}

export class TagsBar {
    private app: App;
    private tagService: TagService;
    private containerEl: HTMLElement;
    private tags: TagWithCount[] = [];
    private selectedTag: string | null = null;
    private onTagClickCallback: (tagName: string) => void;
    
    constructor(options: TagsBarOptions) {
        this.app = options.app;
        this.tagService = options.tagService;
        this.onTagClickCallback = options.onTagClick || (() => {});
        
        this.containerEl = document.createElement('div');
        this.containerEl.className = 'minder-tags-bar';
    }
    
    /**
     * 渲染标签栏
     * @param parentEl 父元素
     * @returns 标签栏元素
     */
    async render(parentEl: HTMLElement): Promise<HTMLElement> {
        this.containerEl.empty();
        parentEl.appendChild(this.containerEl);
        
        // 获取所有标签
        await this.loadTags();
        
        // 创建"全部"标签选项
        const allTagEl = this.containerEl.createDiv({ cls: 'minder-tag-item' });
        allTagEl.classList.toggle('minder-tag-selected', this.selectedTag === null);
        allTagEl.setText('全部');
        allTagEl.addEventListener('click', () => this.selectTag(null));
        
        // 创建标签列表
        for (const tag of this.tags) {
            const tagEl = this.containerEl.createDiv({ cls: 'minder-tag-item' });
            tagEl.classList.toggle('minder-tag-selected', tag.name === this.selectedTag);
            
            tagEl.createSpan({ text: tag.name });
            tagEl.createSpan({ cls: 'minder-tag-count', text: `(${tag.count})` });
            
            tagEl.addEventListener('click', () => this.selectTag(tag.name));
        }
        
        return this.containerEl;
    }
    
    /**
     * 加载标签
     */
    private async loadTags(): Promise<void> {
        this.tags = await this.tagService.getAllTags();
    }
    
    /**
     * 选择标签
     * @param tagName 标签名
     */
    private selectTag(tagName: string | null): void {
        this.selectedTag = tagName;
        
        // 更新UI状态
        const tagItems = this.containerEl.querySelectorAll('.minder-tag-item');
        tagItems.forEach((item, index) => {
            const isSelected = index === 0 ? 
                (this.selectedTag === null) : 
                (this.selectedTag === this.tags[index - 1]?.name);
            
            item.classList.toggle('minder-tag-selected', isSelected);
        });
        
        // 触发回调
        if (tagName !== null) {
            this.onTagClickCallback(tagName);
        } else {
            this.onTagClickCallback('');
        }
    }
    
    /**
     * 刷新标签数据
     */
    async refresh(): Promise<void> {
        await this.loadTags();
        
        if (this.containerEl.parentElement) {
            this.render(this.containerEl.parentElement);
        }
    }
    
    /**
     * 获取选中的标签
     * @returns 选中的标签名
     */
    getSelectedTag(): string | null {
        return this.selectedTag;
    }
    
    /**
     * 设置选中的标签
     * @param tagName 标签名
     */
    setSelectedTag(tagName: string | null): void {
        this.selectTag(tagName);
    }
} 