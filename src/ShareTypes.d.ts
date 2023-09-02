export interface setting {
    首次运行: false;
    设置版本: string; // 用于新版本识别
    启动提示: true;
    语言: { 语言?: string };
    全局: {
        模糊: number;
        缩放: number;
        不透明度: number;
        深色模式: string;
        图标颜色: [string, string, string, string];
    };
    字体: {
        主要字体: string;
        等宽字体: string;
        记住: false | number;
        大小: number;
    };
    ai: {
        keys: string[];
        model: string;
    };
    dics: { name: string; path: { mdd: string; mdx: string } }[];
    OCR: {
        类型: string;
        离线切换: boolean;
        记住: string | false;
    };
    离线OCR: string[][];
    离线OCR配置: {
        node: boolean;
    };
    历史记录设置: {
        保留历史记录: boolean;
        自动清除历史记录: boolean;
        d: number;
        h: number;
    };
    代理: Electron.Config;
    WIFI: { ssid: string; passwd: string }[];
    硬件加速: boolean;
    更新: {
        检查更新: boolean;
        频率: "manual" | "setting" | "weekly" | "start";
        dev: boolean;
        上次更新时间: number;
    };
}
