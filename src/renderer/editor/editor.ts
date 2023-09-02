/// <reference types="vite/client" />

import { setting } from "../../ShareTypes";

const { exec } = require("child_process") as typeof import("child_process");
const { clipboard } = require("electron") as typeof import("electron");

var Store = require("electron-store");
var store = new Store();
var historyStore = new Store({ name: "history" });

const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");

const Mdict = require("js-mdict").default as typeof import("js-mdict").Mdict;

const wifi = require("node-wifi") as typeof import("node-wifi");

/************************************UI */
const indexEl = document.getElementById("index");
indexEl.classList.add("hiden");
indexEl.querySelectorAll("div").forEach((el, i) => {
    el.onclick = () => {
        const id = el.id.replace("b_", "");
        if (id === "more") {
            indexEl.classList.remove("hiden");
        } else if (id === "close") {
            indexEl.classList.add("hiden");
        } else {
            switchToItem(id);
        }
    };
});
function switchToItem(name: string) {
    let name2i = ["main", "history", "setting"];
    let i = name2i.indexOf(name);
    (document.querySelector(".main") as HTMLElement).style.transform = `translateX(${i * -100}vw)`;
}
/************************************main */
var hljs = require("highlight.js");
const { createMathjaxInstance, mathjax } = require("@mdit/plugin-mathjax") as typeof import("@mdit/plugin-mathjax");
const mathjaxInstance = createMathjaxInstance({ a11y: false });
import MarkdownIt from "markdown-it";
var md = MarkdownIt({
    html: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return (
                    '<pre class="hljs"><code>' +
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    "</code></pre>"
                );
            } catch (__) {}
        }

        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + "</code></pre>";
    },
}).use(mathjax, mathjaxInstance);

const inputEl = document.getElementById("main_input") as HTMLInputElement;
const chatEl = document.getElementById("chat");
const runEl = document.getElementById("run");
const buttonContainer = document.getElementById("button-container");

runEl.onclick = () => {
    runInput(inputEl.value);
    inputEl.value = "";
};
type input = "e" | "search" | "gpt" | "js" | "py" | "julia" | "shell";

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
    pushToPage(x.context, x.type);
    console.log(page);

    if (x.type === "e") {
        newPage();
    }
    if (x.type === "gpt") {
        page.at(-1)["addAi"] = true;
        ai();
    }
    if (x.type === "search") {
        pushToPage(x.context, x.type, true);
        renderPage(page);
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
                    pushToPage(std, "shell", true);
                }
                if (stde) {
                    pushToPage(stde, "shell", true);
                }
            }
        });
    }

    renderPage(page);
}

let pageName = crypto.randomUUID();

let page: { type: input; isOutput?: boolean; content: string; addAi?: boolean }[] = [];

function pushToPage(content: string, type: input, isOutput?: boolean, addAi?: boolean) {
    page.push({ type, content });
    if (isOutput) page.at(-1)["isOutput"] = true;
    if (addAi) page.at(-1)["addAi"] = true;
    historyStore.set(`${pageName}.page`, page);
    if (!historyStore.get(`${pageName}.name`)) {
        historyStore.set(`${pageName}.name`, page.at(0)?.content || "name");
        historyStore.set(`${pageName}.createTime`, new Date().getTime());
        initHistory();
    }
}

function newPage() {
    page = [];
    pageName = crypto.randomUUID();
    chatEl.innerHTML = "";
}

function renderPage(p: typeof page) {
    for (let i in p) {
        if (p[i]) {
            if (!chatEl.querySelector(`[data-id="${i}"]`)) {
                let main = document.createElement("div");
                let div = document.createElement("div");
                if (p[i].type === "search" && p[i].isOutput) {
                    div.append(searchDic(p[i].content));
                } else {
                    if (p[i].type === "gpt") {
                        div.innerHTML = md.render(p[i].content);
                    } else {
                        div.innerText = p[i].content;
                    }
                }
                let bar = document.createElement("div");
                let addAi = document.createElement("input");
                addAi.type = "checkbox";
                addAi.checked = p[i].addAi;
                addAi.onclick = () => {
                    p[i]["addAi"] = addAi.checked;
                    historyStore.set(`${pageName}.page`, page);
                };
                bar.append(addAi);
                main.append(bar, div);
                main.classList.add(p[i].isOutput ? "output" : "input");
                main.setAttribute("data-id", i);
                chatEl.append(main);
            }
        }
    }
}

document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();

    if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0).getBoundingClientRect();

        const addSearch = document.createElement("button");
        addSearch.textContent = "搜索";
        const copy = document.createElement("button");
        copy.textContent = "复制";

        const buttonTop = range.top - buttonContainer.offsetHeight - 5;
        const buttonLeft = range.right;

        buttonContainer.style.position = "fixed";
        buttonContainer.style.top = buttonTop + "px";
        buttonContainer.style.left = buttonLeft + 4 + "px";

        buttonContainer.innerHTML = "";
        buttonContainer.append(addSearch, copy);

        addSearch.onclick = () => {
            let str = inputEl.value;
            inputEl.value =
                str.slice(0, inputEl.selectionStart) + selection.toString() + str.slice(inputEl.selectionEnd);
            buttonContainer.innerHTML = "";
        };
        copy.onclick = () => {
            clipboard.writeText(selection.toString());
        };
    } else {
        buttonContainer.innerHTML = "";
    }
});

function formalAiMess(p: typeof page) {
    let l: { role: "system" | "user" | "assistant"; content: string }[] = [];
    for (let i of p) {
        if (i.addAi) {
            l.push({ content: i.content, role: i.isOutput ? "assistant" : "user" });
        }
    }
    return l;
}

function ai() {
    return new Promise((re: (text: string) => void) => {
        fetch(`https://ai.fakeopen.com/v1/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${store.get("ai.keys")[0]}`, "content-type": "application/json" },
            body: JSON.stringify({
                model: store.get("ai.model") || "gpt-3.5-turbo",
                temperature: 0.5,
                top_p: 1,
                frequency_penalty: 1,
                presence_penalty: 1,
                messages: formalAiMess(page),
            }),
        })
            .then((v) => v.json())
            .then((t) => {
                let answer = t.choices[0].message.content;
                console.log(answer);
                pushToPage(answer, "gpt", true, true);
                re(answer);
                renderPage(page);
            });
    });
}
let dicPath: { name: string; path: { mdd: string; mdx: string } }[] = store.get("dics");
let dicList: { [key: string]: { mdd: import("js-mdict").Mdict; mdx: import("js-mdict").Mdict } } = {};
var MIME = {
    css: "text/css",
    img: "image",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    spx: "audio/x-speex",
    wav: "audio/wav",
    mp3: "audio/mp3",
    js: "text/javascript",
};
function getDicSorce(src: string) {}
function initDic() {
    for (let i of dicPath) {
        dicList[i.name] = {
            mdd: new Mdict(i.path.mdd),
            mdx: new Mdict(i.path.mdx),
        };
    }
}
initDic();
function searchDic(text: string) {
    let mainDiv = document.createElement("div");
    for (let i of dicPath) {
        const dict = dicList[i.name].mdx;
        const dict1 = dicList[i.name].mdd;
        let div = document.createElement("div");
        console.log(dict.lookup(text));
        let def = dict.lookup(text).definition;
        if (!def) continue;

        addReviewCard(text);

        div.innerHTML = def;
        div.querySelectorAll("a").forEach((el) => {
            if (el.href.includes("entry://")) {
                el.addEventListener("click", () => {
                    pushToPage(el.href.replace("entry://", ""), "search");
                    renderPage(page);
                });
            } else {
            }
            el.removeAttribute("href");
        });
        div.querySelectorAll("link").forEach((el) => {
            console.log(`\\${el.href}`);
            let newEl = document.createElement("style");
            let b64 = dict1.lookup(`\\${el.getAttribute("href")}`).definition;
            let styleText = decodeURIComponent(escape(window.atob(b64)));
            styleText = styleText.replace(/url\((.+)\)/g, (_a, $1: string) => {
                console.log($1);
                let src = dict1.lookup(`\\${$1.replaceAll(/['"]/g, "")}`).definition;
                return `url("data:font/ttf;base64,${src}")`;
            });
            newEl.innerHTML = styleText;
            el.outerHTML = newEl.outerHTML;
        });
        div.querySelectorAll("img").forEach((el) => {
            let src = el.getAttribute("src");
            console.log(`\\${src}`);

            let b64 = dict1.lookup(`\\${src}`).definition;
            el.src = `data:${src.endsWith(".svg") ? MIME.svg : MIME.img};base64,${b64}`;
        });
        div.querySelectorAll("script").forEach((el) => {
            let src = el.getAttribute("src");
            console.log(`\\${src}`);

            let b64 = dict1.lookup(`\\${src}`).definition;
            let newEl = document.createElement("script");
            newEl.src = `data:${MIME.js};base64,${b64}`;
            el.remove();
            div.append(newEl);
        });

        let sum = document.createElement("summary");
        sum.innerText = i.name;
        let details = document.createElement("details");
        details.append(div);
        sum.append(details);
        mainDiv.append(sum);
    }

    return mainDiv;
}

/************************************记忆 */
import * as fsrsjs from "fsrs.js";

let cards: { [id: string]: { card: fsrsjs.Card } } = {};
let cardDetail: { [id: string]: { context: string; sources: string[] } } = {};

getReviewStore();
function getReviewStore() {
    fs.readFile(path.join(store.path.replace("config.json", ""), "card.json"), "utf-8", (_e, d) => {
        if (d) {
            let json = JSON.parse(d);
            for (let i in json.cards) {
                cards[i] = { card: new fsrsjs.Card() };
                for (let x in json.cards[i].card) {
                    if (x === "last_review" || x === "due") {
                        cards[i].card[x] = new Date(json.cards[i].card[x]);
                    } else {
                        cards[i].card[x] = json.cards[i].card[x];
                    }
                }
            }
            cardDetail = json.cardDetail;
            console.log(cards, cardDetail);
        }
    });
}
function storeReviewStore() {
    let card: { cards: { [id: string]: { card: Object } }; cardDetail: typeof cardDetail } = {
        cards: {},
        cardDetail: {},
    };
    for (let i in cards) {
        card.cards[i] = { card: {} };
        for (let x in cards[i].card) {
            if (x !== "get_retrievability") {
                card.cards[i].card[x] = cards[i].card[x];
            }
        }
    }
    card.cardDetail = cardDetail;
    let text = JSON.stringify(card);
    fs.writeFile(path.join(store.path.replace("config.json", ""), "card.json"), text, (_e) => {});
}
setInterval(storeReviewStore, 60 * 1000);

let fsrs = new fsrsjs.FSRS();

/** 查词 */
function addReviewCard(text: string) {
    let source = pageName;
    text = text.trim();
    for (let i in cardDetail) {
        // 记过了
        if (cardDetail[i].context === text) {
            let now = new Date();
            let sCards = fsrs.repeat(cards[i].card, now);
            // 记过还查，那是忘了
            cards[i].card = sCards[fsrsjs.Rating.Hard].card;
            if (!cardDetail[i].sources.includes(source)) cardDetail[i].sources.push(source);
            return;
        }
    }
    let card = new fsrsjs.Card();
    let id = crypto.randomUUID();
    cards[id] = { card: card };
    cardDetail[id] = { context: text, sources: [source] };
}

function getReviewDue() {
    let now = new Date().getTime();
    let list: { id: string; card: fsrsjs.Card }[] = [];
    for (let i in cards) {
        if (cards[i].card.due.getTime() < now) {
            list.push({ id: i, card: cards[i].card });
        }
    }
    list.sort((a, b) => a.card.due.getTime() - b.card.due.getTime());
    return list;
}

const reviewBEl = document.getElementById("reflash_review_l");
const reviewL = document.getElementById("review_l");

reviewBEl.onclick = () => {
    renderReviewList();
};

function renderReviewList() {
    reviewL.innerHTML = "";
    let l = getReviewDue();
    for (let i of l) {
        let div = document.createElement("div");
        let text = document.createElement("span");
        text.innerText = cardDetail[i.id].context;
        let b = (rating: fsrsjs.Rating, text: string) => {
            let button = document.createElement("button");
            button.innerText = text;
            button.onclick = () => {
                setReviewCard(i.id, rating);
                button.remove();
            };
            return button;
        };
        let againB = b(1, "x");
        let hardB = b(2, "o");
        let goodB = b(3, "v");
        let esayB = b(4, "vv");
        let buttons = document.createElement("div");
        buttons.append(againB, hardB, goodB, esayB);
        div.append(text, buttons);
        reviewL.append(div);
    }
}

function setReviewCard(id: string, rating: fsrsjs.Rating) {
    let now = new Date();
    let sCards = fsrs.repeat(cards[id].card, now);
    cards[id].card = sCards[rating].card;
}

/************************************历史 */
const historyEl = document.getElementById("history");
const historyIHeight = 24;
let historyDivs: HTMLElement[] = [];

function initHistory() {
    historyDivs = [];
    let hisHightEl = document.createElement("div");
    hisHightEl.style.height = Object.keys(historyStore.store).length * historyIHeight + "px";
    historyEl.innerHTML = "";
    historyEl.append(hisHightEl);
    let hisStore = Object.entries(historyStore.store);
    hisStore.sort((a, b) => b[1]["createTime"] - a[1]["createTime"]);
    let n = 0;
    for (let x of hisStore) {
        let i = x[0];
        console.log(i);
        let div = document.createElement("div");
        div.style.top = n * historyIHeight + "px";
        div.setAttribute("data-i", String(n));
        div.innerText = historyStore.get(i).name;
        div.onclick = () => {
            page = historyStore.get(i).page;
            pageName = i as `${string}-${string}-${string}-${string}-${string}`;
            chatEl.innerHTML = "";
            renderPage(page);
            switchToItem("main");
        };
        n++;
        historyDivs.push(div);
    }
    renderHistoryL();
}
initHistory();

function renderHistoryL() {
    let top = historyEl.scrollTop;
    let b = top + historyEl.offsetHeight;
    let start = Math.floor(top / historyIHeight);
    let len = Math.ceil((b - top) / historyIHeight);
    let has = [];
    for (let el of historyEl.querySelector("div").children) {
        let eli = Number(el.getAttribute("data-i"));
        if (eli < start || start + len < eli) {
            el.remove();
        } else {
            has.push(eli);
        }
    }
    for (let i = start; i < Math.min(historyDivs.length, start + len); i++) {
        if (!has.includes(i)) historyEl.querySelector("div").append(historyDivs[i]);
    }
}

historyEl.onscroll = () => {
    renderHistoryL();
};

/************************************设置 */
const wifiScanButton = document.getElementById("scan_wifi");
const wifiConnectList = document.getElementById("wifi_c_list");
const wifiList = document.getElementById("wifi_list");
wifiScanButton.onclick = () => {
    wifiList.innerHTML = "";

    wifi.scan((error, networks) => {
        if (error) {
            console.log(error);
        } else {
            console.log(networks);
            for (let i of networks) {
                if (i.ssid) {
                    let div = document.createElement("div");
                    let ssid = document.createElement("span");
                    let details = document.createElement("span");
                    ssid.innerText = i.ssid;
                    details.innerText = i.quality + "%";
                    div.append(ssid, details);
                    div.onclick = (e) => {
                        if ((e.target as HTMLElement).tagName === "INPUT") return;
                        if (i.security) {
                            let input = document.createElement("input");
                            input.onchange = () => {
                                c(input.value);
                            };
                            div.append(input);
                        } else {
                            c("");
                        }
                    };
                    let c = (passwd: string) => {
                        wifi.connect({ ssid: i.ssid, password: passwd }).then(() => {
                            let wifil = store.get("WIFI") as setting["WIFI"];
                            wifil.unshift({ ssid: i.ssid, passwd: passwd });
                            store.set("WIFI", wifil);
                        });
                    };
                    wifiList.append(div);
                }
            }
        }
    });
};

const aiKeysEl = document.getElementById("ai_keys");
let keys = store.get("ai.keys") as string[];
for (let i in keys) {
    let el = document.createElement("div");
    let ip = document.createElement("input");
    let rm = document.createElement("button");
    rm.onclick = () => {
        keys.splice(Number(i), 1);
        store.set("ai.keys", keys);
    };
    ip.value = keys[i];
    ip.onchange = () => {
        store.set(`ai.keys.${i}`, ip.value);
    };
    el.append(ip);
    aiKeysEl.append(el);
}

document.querySelectorAll("[data-path]").forEach((el: HTMLElement) => {
    const path = el.getAttribute("data-path");
    let value = store.get(path);
    if (el.tagName === "INPUT") {
        let iel = el as HTMLInputElement;
        if (iel.type === "checkbox") {
            iel.checked = value;
            iel.addEventListener("input", () => {
                store.set(path, iel.checked);
            });
        } else {
            iel.value = value;
            iel.addEventListener("input", () => {
                store.set(path, iel.value);
            });
        }
    } else if (el.tagName === "SELECT") {
        (el as HTMLSelectElement).value = value;
        el.onchange = () => {
            store.set(path, (el as HTMLSelectElement).value);
        };
    }
});

/************************************引入 */
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

/************************************启动 */

// 初始化wifi模块
wifi.init({
    iface: null,
});
if (store.get("WIFI.0")) {
    let wifiList = store.get("WIFI") as setting["WIFI"];
    wifi.scan().then((networks) => {
        for (let i of networks) {
            for (let x of wifiList) {
                if (x.ssid === i.ssid) {
                    wifi.connect({ ssid: x.ssid, password: x.passwd }).then(() => {
                        let div = document.createElement("div");
                        let ssid = document.createElement("span");
                        ssid.innerText = x.ssid;
                        div.append(ssid);
                        wifiConnectList.innerHTML = "";
                        wifiConnectList.append(div);
                    });
                    break;
                }
            }
        }
    });
}
