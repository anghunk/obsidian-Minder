import { App } from 'obsidian';
import { MemoService } from './memoService';

export interface TagWithCount {
    name: string;
    count: number;
}

export class TagService {
    private app: App;
    private memoService: MemoService;

    constructor(app: App, memoService: MemoService) {
        this.app = app;
        this.memoService = memoService;
    }

    /**
     * 获取所有标签及其使用数量
     * @returns 标签列表和使用数量
     */
    async getAllTags(): Promise<TagWithCount[]> {
        const memos = await this.memoService.getAllMemos();
        const tagCount: Record<string, number> = {};
        
        // 统计每个标签出现的次数
        memos.forEach(memo => {
            memo.tags.forEach(tag => {
                if (!tagCount[tag]) {
                    tagCount[tag] = 0;
                }
                tagCount[tag]++;
            });
        });
        
        // 转换为数组并排序
        return Object.keys(tagCount)
            .map(tag => ({ name: tag, count: tagCount[tag] }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * 获取使用最多的标签
     * @param limit 限制数量
     * @returns 热门标签列表
     */
    async getPopularTags(limit: number = 10): Promise<TagWithCount[]> {
        const allTags = await this.getAllTags();
        return allTags.slice(0, limit);
    }

    /**
     * 重命名标签
     * @param oldName 旧标签名
     * @param newName 新标签名
     * @returns 更新的笔记数量
     */
    async renameTag(oldName: string, newName: string): Promise<number> {
        if (oldName === newName) return 0;
        
        const memos = await this.memoService.searchMemos({ tags: [oldName] });
        let updatedCount = 0;
        
        for (const memo of memos) {
            // 替换内容中的标签
            const newContent = memo.content.replace(
                new RegExp(`#${oldName}\\b`, 'g'), 
                `#${newName}`
            );
            
            if (newContent !== memo.content) {
                await this.memoService.updateMemo(memo.id, newContent);
                updatedCount++;
            }
        }
        
        return updatedCount;
    }

    /**
     * 删除标签
     * @param tagName 标签名
     * @returns 更新的笔记数量
     */
    async deleteTag(tagName: string): Promise<number> {
        const memos = await this.memoService.searchMemos({ tags: [tagName] });
        let updatedCount = 0;
        
        for (const memo of memos) {
            // 替换内容中的标签
            const newContent = memo.content.replace(
                new RegExp(`#${tagName}\\b`, 'g'), 
                ''
            );
            
            if (newContent !== memo.content) {
                await this.memoService.updateMemo(memo.id, newContent);
                updatedCount++;
            }
        }
        
        return updatedCount;
    }

    /**
     * 合并多个标签为一个
     * @param tags 要合并的标签列表
     * @param targetTag 目标标签
     * @returns 更新的笔记数量
     */
    async mergeTags(tags: string[], targetTag: string): Promise<number> {
        let updatedCount = 0;
        
        for (const tag of tags) {
            if (tag !== targetTag) {
                updatedCount += await this.renameTag(tag, targetTag);
            }
        }
        
        return updatedCount;
    }
} 