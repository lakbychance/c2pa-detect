import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
    manifest_version: 3,
    name: pkg.name,
    version: pkg.version,
    "content_security_policy": {
        "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
    },
    icons: {
        48: 'public/icons/logo.png',
    },
    action: {
        default_icon: {
            48: 'public/icons/logo.png',
        },
    },
    background: {
        service_worker: "src/background/index.ts"
    },
    permissions: [
        // "scripting",
        "contextMenus",
        "notifications",
        "offscreen"
    ],
    "host_permissions": [
        "<all_urls>"
    ]
})

