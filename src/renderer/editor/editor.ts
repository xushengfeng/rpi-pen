/// <reference types="vite/client" />

const { exec } = require("child_process") as typeof import("child_process");

var Store = require("electron-store");
var store = new Store();

/************************************UI */
document.getElementById("b_main").onclick = () => {
    document.getElementById("main").classList.add("show");
};
/************************************main */

const inputEl = document.getElementById("main_input") as HTMLInputElement;
const chatEl = document.getElementById("chat");
const runEl = document.getElementById("run");
const buttonContainer = document.getElementById("button-container");

runEl.onclick = () => {
    runInput(inputEl.value);
    inputEl.value = "";
};
type input = "e" | "search" | "gpt" | "js" | "py" | "julia" | "shell" | "output";

function analyzeInput(text: string): {
    type: input;
    context: string;
} {
    if (!text) {
        return { type: "e", context: "" };
    } else {
        if (text.startsWith("@gpt")) {
            return { type: "gpt", context: text.slice(4) };
        } else if (text.startsWith("@js")) {
            return { type: "js", context: text.slice(3) };
        } else if (text.startsWith("@py")) {
            return { type: "py", context: text.slice(3) };
        } else if (text.startsWith("@julia")) {
            return { type: "julia", context: text.slice(6) };
        } else if (text.startsWith("!")) {
            return { type: "shell", context: text.slice(1) };
        } else {
            return { type: "search", context: text };
        }
    }
}
function runInput(text: string) {
    let x = analyzeInput(text);
    page.push({ content: x.context, type: x.type });
    console.log(page);
    renderPage(page);

    if (x.type === "e") {
        newPage();
    }
    if (x.type === "gpt") {
        aiMessages.push(page.length - 1);
        ai();
    }
    if (x.type === "js") {
        eval(x.context);
    }
    if (x.type === "py") {
    }
    if (x.type === "shell") {
        exec(`${x.context}`, (err, std, stde) => {
            if (!err) {
                if (std) {
                    page.push({ content: std, type: "shell", isOutput: true });
                }
                if (stde) {
                    page.push({ content: stde, type: "shell", isOutput: true });
                }
            }
        });
    }
}

let page: { type: input; isOutput?: boolean; content: string }[] = [];

function newPage() {
    page = [];
    aiMessages = [];
    chatEl.innerHTML = "";
}

function renderPage(p: typeof page) {
    for (let i in p) {
        if (p[i]) {
            if (!chatEl.querySelector(`[data-id="${i}"]`)) {
                let div = document.createElement("div");
                div.innerHTML = p[i].content;
                div.classList.add(p[i].isOutput ? "output" : "input");
                div.setAttribute("data-id", i);
                chatEl.append(div);
            }
        }
    }
}

document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();

    if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0).getBoundingClientRect();

        const button = document.createElement("button");
        button.textContent = "搜索";

        const buttonTop = range.top - button.offsetHeight - 5;
        const buttonLeft = range.right;

        button.style.position = "fixed";
        button.style.top = buttonTop + "px";
        button.style.left = buttonLeft + 4 + "px";

        buttonContainer.innerHTML = "";
        buttonContainer.appendChild(button);

        button.onclick = () => {
            inputEl.value = selection.toString();
            buttonContainer.innerHTML = "";
        };
    } else {
        buttonContainer.innerHTML = "";
    }
});

let aiMessages: number[] = [];
function formalAiMess(m: typeof aiMessages, p: typeof page) {
    let l: { role: "system" | "user" | "assistant"; content: string }[] = [];
    for (let i of m) {
        l.push({ content: p[i].content, role: p[i].isOutput ? "assistant" : "user" });
    }
    return l;
}

function ai() {
    return new Promise((re: (text: string) => void) => {
        fetch(`https://ai.fakeopen.com/v1/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${store.get("ai.keys")[0]}`, "content-type": "application/json" },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                temperature: 0,
                top_p: 1,
                frequency_penalty: 1,
                presence_penalty: 1,
                messages: formalAiMess(aiMessages, page),
            }),
        })
            .then((v) => v.json())
            .then((t) => {
                let answer = t.choices[0].message.content;
                console.log(answer);
                page.push({ content: answer, type: "gpt", isOutput: true });
                aiMessages.push(page.length - 1);
                re(answer);
                renderPage(page);
            });
    });
}

/************************************引入 */
const fs = require("fs") as typeof import("fs");

var 模糊 = store.get("全局.模糊");
if (模糊 != 0) {
    document.documentElement.style.setProperty("--blur", `blur(${模糊}px)`);
} else {
    document.documentElement.style.setProperty("--blur", `none`);
}

document.documentElement.style.setProperty("--alpha", store.get("全局.不透明度"));

var 字体 = store.get("字体");
document.documentElement.style.setProperty("--main-font", 字体.主要字体);
document.documentElement.style.setProperty("--monospace", 字体.等宽字体);

document.documentElement.style.setProperty("--icon-color", store.get("全局.图标颜色")[1]);
if (store.get("全局.图标颜色")[3])
    document.documentElement.style.setProperty("--icon-color1", store.get("全局.图标颜色")[3]);

const path = require("path") as typeof import("path");

/************************************OCR */

function ocr(
    img: string,
    type: string | "baidu" | "youdao",
    callback: (error: any, r: { raw: ocrResult; text: string }) => void
) {
    localOcr(type, img, (err, r) => {
        return callback(err, r);
    });
}

type ocrResult = {
    text: string;
    box: /** lt,rt,rb,lb */ number[][];
}[];
/**
 * 离线OCR
 * @param {String} arg 图片base64
 * @param {Function} callback 回调
 */
async function localOcr(
    type: string,
    arg: string,
    callback: (error: Error, result: { raw: ocrResult; text: string }) => void
) {
    try {
        let l: [string, string, string, string, any];
        for (let i of store.get("离线OCR")) if (i[0] == type) l = i;
        function ocrPath(p: string) {
            return path.join(path.isAbsolute(p) ? "" : path.join(__dirname, "../../ocr/ppocr"), p);
        }
        let detp = ocrPath(l[1]),
            recp = ocrPath(l[2]),
            字典 = ocrPath(l[3]);
        console.log(ocrPath);
        const lo = require("esearch-ocr") as typeof import("esearch-ocr");
        await lo.init({
            detPath: detp,
            recPath: recp,
            dic: fs.readFileSync(字典).toString(),
            ...l[4],
            node: true,
            detShape: [960, 960],
        });
        let img = document.createElement("img");
        img.src = "data:image/png;base64," + arg;
        img.onload = async () => {
            let canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d").drawImage(img, 0, 0);
            lo.ocr(canvas.getContext("2d").getImageData(0, 0, img.width, img.height))
                .then((l) => {
                    console.log(l);
                    let t = "";
                    for (let i of l) {
                        t += i.text + "\n";
                    }
                    let ll = [];
                    for (let i of l) {
                        ll.push({ box: i.box, text: i.text });
                    }
                    callback(null, { raw: ll, text: t });
                })
                .catch((e) => {
                    callback(e, null);
                });
        };
    } catch (error) {
        callback(error, null);
    }
}
