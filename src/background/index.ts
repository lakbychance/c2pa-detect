let offscreenReadyResolve: (() => void) | null = null;
let offscreenReadyPromise: Promise<void> | null = null;

function waitForOffscreenReady() {
    if (!offscreenReadyPromise) {
        offscreenReadyPromise = new Promise((res) => {
            offscreenReadyResolve = res;
        });
    }
    return offscreenReadyPromise;
}


async function ensureOffscreen() {
    console.log('Creating Offscreen document...');
    const existing = await chrome.offscreen.hasDocument?.();
    if (existing) {
        console.log('Offscreen document already exists');
        return;
    }

    await chrome.offscreen.createDocument({
        url: "index.html",
        reasons: ["WORKERS"],
        justification: "Run c2pa-web which creates blob workers"
    });

    console.log('Created Offscreen document');

    await waitForOffscreenReady();

    console.log('Offscreen document is ready')
}

export default chrome.runtime.onInstalled.addListener(() => {
    console.log("Background Service Worker working...");


    const contextMenuOptionId = "verify-content-credentials";

    chrome.contextMenus.create({
        id: contextMenuOptionId,
        title: "Verify Content Credentials",
        contexts: ["image"],
    });

    chrome.contextMenus.onClicked.addListener(async (info) => {
        if (info.menuItemId !== contextMenuOptionId) return;

        const imageUrl = info.srcUrl;
        if (!imageUrl) return;
        await ensureOffscreen();

        chrome.runtime.sendMessage({
            type: "IMAGE_SELECTED",
            imageUrl,
        });
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "OFFSCREEN_READY") {
            offscreenReadyResolve?.();
            offscreenReadyResolve = null;
        }
    });
});