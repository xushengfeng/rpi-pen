/// <reference types="vite/client" />
// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain, Notification, nativeTheme, screen, crashReporter } from "electron";

const Store = require("electron-store");
import { setting } from "../ShareTypes";
import * as path from "path";
const runPath = path.join(path.resolve(__dirname, ""), "../../");
import { exec } from "child_process";
import * as fs from "fs";
import * as os from "os";
import url from "node:url";

var store = new Store();

var /** 是否开启开发模式 */ dev: boolean;
// 自动开启开发者模式
if (process.argv.includes("-d") || import.meta.env.DEV) {
    dev = true;
} else {
    dev = false;
}

/** 加载网页 */
function rendererPath(window: BrowserWindow | Electron.WebContents, fileName: string, q?: Electron.LoadFileOptions) {
    if (!q) {
        q = { query: { config_path: app.getPath("userData") } };
    } else if (!q.query) {
        q.query = { config_path: app.getPath("userData") };
    } else {
        q.query["config_path"] = app.getPath("userData");
    }
    if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
        let mainUrl = `${process.env["ELECTRON_RENDERER_URL"]}/${fileName}`;
        let x = new url.URL(mainUrl);
        if (q) {
            if (q.search) x.search = q.search;
            if (q.query) {
                for (let i in q.query) {
                    x.searchParams.set(i, q.query[i]);
                }
            }
            if (q.hash) x.hash = q.hash;
        }
        window.loadURL(x.toString());
    } else {
        window.loadFile(path.join(__dirname, "../renderer", fileName), q);
    }
}

if (!store.get("硬件加速")) {
    app.disableHardwareAcceleration();
}

// 自启动
ipcMain.on("autostart", (event, m, v) => {
    if (m == "set") {
        if (process.platform == "linux") {
            if (v) {
                exec("mkdir ~/.config/autostart");
                exec(`cp ${runPath}/assets/e-search.desktop ~/.config/autostart/`);
            } else {
                exec("rm ~/.config/autostart/e-search.desktop");
            }
        } else {
            app.setLoginItemSettings({ openAtLogin: v });
        }
    } else {
        if (process.platform == "linux") {
            exec("test -e ~/.config/autostart/e-search.desktop", (error, _stdout, _stderr) => {
                error ? event.sender.send("开机启动状态", false) : event.sender.send("开机启动状态", true);
            });
        } else {
            event.sender.send("开机启动状态", app.getLoginItemSettings().openAtLogin);
        }
    }
});

// cil参数重复启动;
var firstOpen = true;
const isFirstInstance = app.requestSingleInstanceLock();
if (!isFirstInstance) {
    firstOpen = false;
    app.quit();
} else {
    app.on("second-instance", (_event, commanLine, _workingDirectory) => {
        argRun(commanLine);
    });
}

/**
 * 根据命令运行
 * @param {string[]} c 命令
 */
function argRun(c: string[]) {
    if (c.includes("-d")) dev = true;
}

async function rmR(dir_path: string) {
    fs.rm(dir_path, { recursive: true }, (err) => {
        if (err) console.error(err);
    });
}

app.commandLine.appendSwitch("enable-experimental-web-platform-features", "enable");

app.whenReady().then(() => {
    crashReporter.start({ uploadToServer: false });

    if (store.get("首次运行") === undefined) setDefaultSetting();
    fix_setting_tree();

    // 初始化设置
    Store.initRenderer();

    // 启动时提示
    if (firstOpen && store.get("启动提示"))
        new Notification({
            title: app.name,
            body: `${app.name} ${"已经在后台启动"}`,
            icon: `${runPath}/assets/logo/64x64.png`,
        }).show();

    // tmp目录
    if (!fs.existsSync(os.tmpdir() + "/eSearch")) fs.mkdir(os.tmpdir() + "/eSearch", () => {});
    createMainWindow("editor.html");

    nativeTheme.themeSource = store.get("全局.深色模式");
});

app.on("will-quit", () => {
    // 删除临时文件夹
    rmR(path.join(os.tmpdir(), "eSearch"));
});

var theIcon = null;
if (process.platform == "win32") {
    theIcon = path.join(runPath, "assets/logo/icon.ico");
} else {
    theIcon = path.join(runPath, "assets/logo/1024x1024.png");
}

const isMac = process.platform === "darwin";

// 主页面
async function createMainWindow(webPage: string, t?: boolean | Array<any>) {
    let mainWindow = new BrowserWindow({
        fullscreen: true,
        backgroundColor: nativeTheme.shouldUseDarkColors ? "#0f0f0f" : "#ffffff",
        icon: theIcon,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
        },
    });

    // 自定义界面
    rendererPath(mainWindow, webPage || "editor.html");

    await mainWindow.webContents.session.setProxy(store.get("代理"));

    if (dev) mainWindow.webContents.openDevTools();

    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow.webContents.setZoomFactor(store.get("全局.缩放") || 1.0);
    });
}

// 默认设置
var defaultSetting: setting = {
    首次运行: false,
    设置版本: app.getVersion(),
    启动提示: true,
    语言: {},
    全局: {
        模糊: 25,
        缩放: 1,
        不透明度: 0.4,
        深色模式: "system",
        图标颜色: ["", "", "", ""],
    },
    字体: {
        主要字体: "",
        等宽字体: "",
        记住: false,
        大小: 16,
    },
    ai: { keys: [] },
    dics: [],
    OCR: {
        类型: "默认",
        离线切换: true,
        记住: false,
    },
    离线OCR: [["默认", "默认/ppocr_det.onnx", "默认/ppocr_rec.onnx", "默认/ppocr_keys_v1.txt"]],
    离线OCR配置: {
        node: false,
    },
    历史记录设置: {
        保留历史记录: true,
        自动清除历史记录: false,
        d: 14,
        h: 0,
    },
    代理: {
        mode: "direct",
        pacScript: "",
        proxyRules: "",
        proxyBypassRules: "",
    },
    硬件加速: true,
    更新: {
        检查更新: true,
        频率: "setting",
        dev: false,
        上次更新时间: 0,
    },
};

function setDefaultSetting() {
    for (let i in defaultSetting) {
        if (i == "语言") {
            store.set(i, { 语言: app.getLocale() || "zh-HANS" });
        } else {
            store.set(i, defaultSetting[i]);
        }
    }
}

// 增加设置项后，防止undefined
function fix_setting_tree() {
    if (store.get("设置版本") == app.getVersion()) return;
    var tree = "defaultSetting";
    walk(tree);
    function walk(path: string) {
        var x = eval(path);
        if (Object.keys(x).length == 0) {
            path = path.slice(tree.length + 1); /* 去除开头主tree */
            if (store.get(path) === undefined) store.set(path, x);
        } else {
            for (let i in x) {
                var c_path = path + "." + i;
                if (x[i].constructor === Object) {
                    walk(c_path);
                } else {
                    c_path = c_path.slice(tree.length + 1); /* 去除开头主tree */
                    if (store.get(c_path) === undefined) store.set(c_path, x[i]);
                }
            }
        }
    }
}
