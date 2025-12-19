import { createC2pa } from '@contentauth/c2pa-web';
import wasmSrc from '@contentauth/c2pa-wasm/assets/c2pa_bg.wasm?url';
import { useEffect } from 'react';
import { classifyImageOrigin } from './utils/ai'
import { formatClassificationLabel, normalizeAISourceName } from './utils/ai';

const c2pa = await createC2pa({
  wasmSrc,
});

function App() {
  useEffect(() => {
    const handler = async ({ type, imageUrl }: { type: string, imageUrl: string }) => {
      if (type === "IMAGE_SELECTED" && imageUrl) {
        const response = await fetch(imageUrl);
        const imageBlob = await response.blob();
        const reader = await c2pa.reader.fromBlob(imageBlob.type, imageBlob);
        const manifestStore = await reader?.manifestStore();
        if (manifestStore) {
          const result = classifyImageOrigin(manifestStore);
          const classificationLabel = formatClassificationLabel(result.classification);
          const sourceName = normalizeAISourceName(result.aiGenerator);
          alert(`Result: ${classificationLabel}\nSource: ${sourceName}`);
        }
        else {
          alert("Unable to get C2PA manifest for this image")
        }

        await reader?.free();
      }
    };

    chrome.runtime.sendMessage({
      type: "OFFSCREEN_READY",
    });


    chrome.runtime.onMessage.addListener(handler);

    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  return null;
}

export default App;
