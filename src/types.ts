import { TFile } from "obsidian";

export interface MinderSettings {
    // 存储笔记的文件夹路径
    notesFolder: string;
    // 日期格式
    dateFormat: string;
    // 每个视图显示的笔记数量
    displayCount: number;
    // 默认排序方式
    defaultSort: "createTime" | "updateTime";
    // 软件启动时打开插件
    openOnStartup: boolean;
}

export interface MemoItem {
    // 笔记唯一ID
    id: string;
    // 笔记内容
    content: string;
    // 创建时间
    createdAt: number;
    // 更新时间
    updatedAt: number;
    // 标签列表
    tags: string[];
    // 关联文件（如果有）
    attachments?: string[];
    // 关联的Obsidian文件（如果有）
    linkedFile?: TFile;
}

export enum ViewType {
    ALL = "all",
    TODAY = "today",
    TAG = "tag",
}

export interface SearchQuery {
    text?: string;
    tags?: string[];
    timeRange?: {
        from?: number;
        to?: number;
    };
} 