import { App, TFile } from 'obsidian';
import { MemoItem, SearchQuery } from '../types';
import { 
    ensureFolderExists, 
    generateId, 
    parseMemoFileName, 
    createMemoFileName, 
    createMemoMarkdown, 
    parseMemoMarkdown,
    extractTagsFromContent 
} from '../utils/file';

export class MemoService {
    private app: App;
    private memoFolder: string;

    constructor(app: App, memoFolder: string) {
        this.app = app;
        this.memoFolder = memoFolder;
    }

    /**
     * 初始化，确保笔记文件夹存在
     */
    async initialize(): Promise<void> {
        await ensureFolderExists(this.app, this.memoFolder);
    }

    /**
     * 创建新笔记
     * @param content 笔记内容
     * @returns 创建的笔记
     */
    async createMemo(content: string): Promise<MemoItem> {
        const now = Date.now();
        const id = generateId();
        const tags = extractTagsFromContent(content);

        const memo: MemoItem = {
            id,
            content,
            createdAt: now,
            updatedAt: now,
            tags
        };

        const fileName = createMemoFileName(memo);
        const filePath = `${this.memoFolder}/${fileName}`;
        const fileContent = createMemoMarkdown(memo);

        await this.app.vault.create(filePath, fileContent);

        return memo;
    }

    /**
     * 更新笔记
     * @param id 笔记ID
     * @param content 新的笔记内容
     * @returns 更新后的笔记
     */
    async updateMemo(id: string, content: string): Promise<MemoItem | null> {
        const memo = await this.getMemoById(id);
        
        if (!memo || !memo.linkedFile) {
            return null;
        }

        const updatedMemo: MemoItem = {
            ...memo,
            content,
            updatedAt: Date.now(),
            tags: extractTagsFromContent(content)
        };

        const fileContent = createMemoMarkdown(updatedMemo);
        await this.app.vault.modify(memo.linkedFile, fileContent);

        return updatedMemo;
    }

    /**
     * 删除笔记
     * @param id 笔记ID
     * @returns 是否成功删除
     */
    async deleteMemo(id: string): Promise<boolean> {
        const memo = await this.getMemoById(id);
        
        if (!memo || !memo.linkedFile) {
            return false;
        }

        await this.app.vault.delete(memo.linkedFile);
        return true;
    }

    /**
     * 根据ID获取笔记
     * @param id 笔记ID
     * @returns 笔记数据
     */
    async getMemoById(id: string): Promise<MemoItem | null> {
        const files = this.app.vault.getFiles();
        const memoFile = files.find(file => 
            file.path.startsWith(this.memoFolder) && 
            file.name.includes(id)
        );

        if (!memoFile) {
            return null;
        }

        const content = await this.app.vault.read(memoFile);
        const { createdAt } = parseMemoFileName(memoFile.name);
        const memo = parseMemoMarkdown(content, id, createdAt);
        
        return {
            ...memo,
            linkedFile: memoFile
        };
    }

    /**
     * 获取所有笔记
     * @param limit 限制数量
     * @param sort 排序方式
     * @returns 笔记列表
     */
    async getAllMemos(limit?: number, sort: 'createTime' | 'updateTime' = 'createTime'): Promise<MemoItem[]> {
        const files = this.app.vault.getFiles().filter(
            file => file.path.startsWith(this.memoFolder) && file.extension === 'md'
        );

        const memos: MemoItem[] = [];

        for (const file of files) {
            try {
                const { id, createdAt } = parseMemoFileName(file.name);
                const content = await this.app.vault.read(file);
                const memo = parseMemoMarkdown(content, id, createdAt);
                
                memos.push({
                    ...memo,
                    linkedFile: file
                });
            } catch (error) {
                console.error(`Failed to parse memo file: ${file.name}`, error);
            }
        }

        // 排序
        memos.sort((a, b) => {
            if (sort === 'createTime') {
                // 按创建时间排序（降序，最新的在前面）
                return b.createdAt - a.createdAt;
            } else {
                // 按更新时间排序（降序，最新的在前面）
                return b.updatedAt - a.updatedAt;
            }
        });

        return limit ? memos.slice(0, limit) : memos;
    }

    /**
     * 搜索笔记
     * @param query 搜索条件
     * @returns 符合条件的笔记列表
     */
    async searchMemos(query: SearchQuery): Promise<MemoItem[]> {
        const allMemos = await this.getAllMemos();
        
        return allMemos.filter(memo => {
            // 文本匹配
            if (query.text && !memo.content.toLowerCase().includes(query.text.toLowerCase())) {
                return false;
            }
            
            // 标签匹配
            if (query.tags && query.tags.length > 0) {
                const hasAllTags = query.tags.every(tag => 
                    memo.tags.includes(tag)
                );
                if (!hasAllTags) return false;
            }
            
            // 时间范围匹配
            if (query.timeRange) {
                if (query.timeRange.from && memo.createdAt < query.timeRange.from) {
                    return false;
                }
                if (query.timeRange.to && memo.createdAt > query.timeRange.to) {
                    return false;
                }
            }
            
            return true;
        });
    }
} 