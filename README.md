# C2PA Detect

A Chrome browser extension that detects and verifies C2PA (Coalition for Content Provenance and Authenticity) credentials in images to determine their AI origin classification.

## How Effective Is It Really?

TBH, it's not useful yet. Most of the internet serves media assets through CDNs, and most CDNs don't preserve C2PA credentials when processing uploaded images. [Cloudflare](https://blog.cloudflare.com/preserve-content-credentials-with-cloudflare-images/) is one of the few that officially released support for it. So when you see pictures on LinkedIn, Twitter, etc. that are likely AI-generated, you can't verify them with this tool because those credentials got stripped during the upload/CDN pipeline.

Is this extension novel? Not really. Digimarc prototyped their own [extension](https://github.com/digimarc-corp/c2pa-content-credentials-extension) when C2PA packages were newly released. Theirs works by using extension content scripts to show an icon on top of images. You could enable automatic parsing of all images or manually right-click and verify, similar to this extension. One limitation I saw from theirs was it not working on Gemini due to some permission issues. Also, it currently uses an old forked c2pa package.

I personally don't care about labeling each image with an icon to tell me if it's AI or not. I only wanted a tool that allows me to verify authenticity if needed via a simple alert. I think if C2PA adoption matures more, it makes sense to create a proper UI for it with more info. 

## How It Works

The extension uses the C2PA Web SDK to:
1. Extract C2PA manifest data from images when you right-click them
2. Traverse the manifest structure to detect AI-related actions and digital source types
3. Classify the image origin based on the manifest assertions
4. Extract generator information from software agents, claim generators, or signature issuers

## Installation

### Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd c2pa-detect
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this project


## Usage

1. After installing the extension, navigate to any webpage with images
2. Right-click on an image
3. Select "Verify Content Credentials" from the context menu
4. If the manifest store is found, the extension will analyze the image and display:
   - Classification result (AI-Generated, AI-Assisted, Non-AI, or Unknown)
   - AI generator name (if applicable)

## Technical Details

### Architecture

- **Background Service Worker**: Handles context menu interactions and manages offscreen documents.
- **Offscreen Document**:  Main UI component that processes image analysis and alerts the user with result.
- **AI Classification Module**: Core logic for analyzing C2PA manifests and classifying image origins

### Key Technologies

- **React 19**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server
- **@contentauth/c2pa-web**: C2PA SDK for reading manifests
- **@contentauth/c2pa-wasm**: WebAssembly module for C2PA processing
- **Chrome Extension Manifest V3**: Modern extension API

### Classification Logic

The extension analyzes C2PA manifests by:
1. Checking for `c2pa.created` actions with `trainedAlgorithmicMedia` digital source type → **AI-Generated**
2. Checking for `c2pa.edited` actions with AI involvement → **AI-Assisted**
3. Traversing ingredient manifests recursively to detect AI origins
4. Extracting generator information from multiple sources (software agents, claim generators, signatures)

## Limitations

- Only works with images that contain C2PA manifest data
- For Gemini generated images, it sometimes is unable to get manifest store even though it can be found if the same image is downloaded and then verified (here)[verify.contentcredentials.com]
- Requires offscreen document support.

## License

MIT

## Acknowledgments

- Built with [C2PA Web SDK](https://github.com/contentauth/c2pa-js) by Content Authenticity Initiative
- Uses [CRXJS Vite Plugin](https://crxjs.dev/) for Chrome extension development

