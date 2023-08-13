var arch = (process.env["npm_config_arch"] || process.env["M_ARCH"] || process.arch) == "arm64" ? ["arm64"] : ["x64"];
/**
 * @type import("electron-builder").Configuration
 */
let build = {
    appId: "com.esearch.app",
    directories: {
        output: "build",
    },
    compression: "maximum",
    icon: "./assets/logo",
    electronDownload: {
        mirror: "https://npmmirror.com/mirrors/electron/",
    },
    npmRebuild: false,
    asar: false,
    artifactName: "${productName}-${version}-${platform}-" + arch[0] + ".${ext}",
    beforePack: "./before_pack.js",
    linux: {
        category: "Utility",
        target: [
            { target: "deb", arch: "arm64" },
            { target: "AppImage", arch: "arm64" },
        ],
        files: [
            "!.vscode",
            "!.github",
            "!assets/logo/icon.icns",
            "!assets/logo/icon.ico",
            "!src",
            "!node_modules/onnxruntime-node/bin/napi-v3/win32",
            "!node_modules/onnxruntime-node/bin/napi-v3/darwin",
            "!node_modules/onnxruntime-web",
        ],
    },
};

module.exports = build;
