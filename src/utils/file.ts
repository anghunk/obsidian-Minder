import { App, TFile, TFolder } from "obsidian";
import { MemoItem } from "../types";

/**
 * 确保文件夹存在，如果不存在则创建
 * @param app Obsidian App实例
 * @param folderPath 文件夹路径
 */
export async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
    const folderExists = app.vault.getAbstractFileByPath(folderPath) instanceof TFolder;
    
    if (!folderExists) {
        await app.vault.createFolder(folderPath);
    }
}

/**
 * 解析文件名中的笔记元数据
 * @param fileName 文件名
 * @returns MemoItem部分属性
 */
export function parseMemoFileName(fileName: string): { id: string, createdAt: number } {
    // 修改为新的文件名格式：minder-{timestamp}.md
    const match = fileName.match(/minder-(\d+)\.md$/);
    
    if (match && match.length >= 2) {
        const timestamp = parseInt(match[1], 10);
        return {
            id: timestamp.toString(), // 使用时间戳作为ID
            createdAt: timestamp
        };
    }
    
    // 如果格式不匹配，使用当前时间和随机ID
    const now = Date.now();
    return {
        id: now.toString(),
        createdAt: now
    };
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export function generateId(): string {
    return Date.now().toString();
}

/**
 * 从笔记内容中提取标签
 * @param content 笔记内容
 * @returns 标签数组
 */
export function extractTagsFromContent(content: string): string[] {
    const tagRegex = /#([^\s#]+)/g;
    const matches = content.match(tagRegex);
    
    if (!matches) return [];
    
    // 移除#前缀并去重
    return [...new Set(matches.map(tag => tag.substring(1)))];
}

/**
 * 创建笔记文件名
 * @param memo 笔记数据
 * @returns 文件名
 */
export function createMemoFileName(memo: MemoItem): string {
    // 修改为新的文件名格式：minder-{timestamp}.md
    return `minder-${memo.createdAt}.md`;
}

/**
 * 从笔记内容创建Markdown文本
 * @param memo 笔记数据
 * @returns Markdown文本
 */
export function createMemoMarkdown(memo: MemoItem): string {
    const tagsText = memo.tags.length > 0 ? memo.tags.map(tag => `#${tag}`).join(' ') : '';
    const timestamp = new Date(memo.createdAt).toISOString();
    
    return `---
id: ${memo.id}
created: ${timestamp}
updated: ${new Date(memo.updatedAt).toISOString()}
tags: ${tagsText}
---

${memo.content}
`;
}

/**
 * 从Markdown文本解析笔记
 * @param content Markdown文本
 * @param id 笔记ID
 * @param createdAt 创建时间
 * @returns 笔记数据
 */
export function parseMemoMarkdown(content: string, id: string, createdAt: number): MemoItem {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontMatterRegex);
    
    let frontMatter: Record<string, any> = {};
    let mainContent = content;
    
    if (match) {
        const frontMatterText = match[1];
        const lines = frontMatterText.split('\n');
        
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':').map(part => part.trim());
            const value = valueParts.join(':').trim();
            
            if (key && value) {
                frontMatter[key] = value;
            }
        });
        
        mainContent = content.substring(match[0].length).trim();
    }
    
    // 提取标签
    const tags = frontMatter.tags ? 
        frontMatter.tags.split(' ').filter(Boolean).map((t: string) => t.replace(/^#/, '')) : 
        extractTagsFromContent(mainContent);
    
    return {
        id: frontMatter.id || id,
        content: mainContent,
        createdAt: frontMatter.created ? new Date(frontMatter.created).getTime() : createdAt,
        updatedAt: frontMatter.updated ? new Date(frontMatter.updated).getTime() : Date.now(),
        tags
    };
} 