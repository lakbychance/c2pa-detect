import { type ManifestStore } from '@contentauth/c2pa-web';

/* ============================================================
   C2PA AI Origin Detection – TypeScript
   ============================================================ */

interface ActionsAssertionData {
    actions: Array<{
        action: string;
        digitalSourceType?: string;
        description?: string;
        softwareAgent?: {
            name?: string;
        };
    }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}


function isActionsAssertion(
    assertion: { label: string; data: unknown }
): assertion is { label: "c2pa.actions.v2"; data: ActionsAssertionData } {
    if (assertion.label !== "c2pa.actions.v2") return false;

    if (!isRecord(assertion.data)) return false;

    const actions = assertion.data["actions"];
    if (!Array.isArray(actions)) return false;

    return true;

    return false;
}


/* ============================================================
   Classification + attribution types
   ============================================================ */

export type OriginClassification =
    | "ai-generated"
    | "ai-assisted"
    | "non-ai"
    | "unknown";

export interface AIGeneratorInfo {
    name?: string;      // e.g. "OpenAI", "Google"
    source?: string;    // claim_generator | signature | softwareAgent
    manifestId?: ManifestId;
}

/* ============================================================
   Constants
   ============================================================ */

const TRAINED_AI =
    "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";

/* ============================================================
   Helper: extract generator identity from a manifest
   ============================================================ */

function extractGenerator(
    manifest: ManifestStore['manifests'][0],
    manifestId: ManifestId
): AIGeneratorInfo {
    // 1️⃣ Prefer explicit software agent (most precise, when present)
    for (const assertion of manifest.assertions ?? []) {
        if (assertion.label !== "c2pa.actions.v2") continue;
        if (!isActionsAssertion(assertion)) continue;

        for (const action of assertion.data.actions ?? []) {
            if (action.softwareAgent?.name) {
                return {
                    name: action.softwareAgent.name,
                    source: "softwareAgent",
                    manifestId,
                };
            }
        }
    }

    // 2️⃣ claim_generator_info (very common)
    const generator = manifest.claim_generator_info?.[0]?.name;
    if (generator) {
        return {
            name: generator,
            source: "claim_generator",
            manifestId,
        };
    }

    // 3️⃣ signature issuer (fallback)
    if (manifest.signature_info?.issuer) {
        return {
            name: manifest.signature_info.issuer,
            source: "signature",
            manifestId,
        };
    }

    return { manifestId };
}

/* ============================================================
   Core traversal
   ============================================================ */

interface ClassificationResult {
    classification: OriginClassification;
    generator?: AIGeneratorInfo;
}

type ManifestId = ManifestStore['active_manifest'];

function classifyManifest(
    store: ManifestStore,
    manifestId: ManifestId,
    visited: Set<string>
): ClassificationResult {
    if (!manifestId) return {
        classification: "unknown"
    }
    if (visited.has(manifestId)) {
        return { classification: "unknown" };
    }
    visited.add(manifestId);

    const manifest = store.manifests[manifestId];
    if (!manifest) {
        return { classification: "unknown" };
    }

    let sawAIEdit = false;

    // 1️⃣ Inspect actions
    for (const assertion of manifest.assertions ?? []) {
        if (assertion.label !== "c2pa.actions.v2") continue;
        if (!isActionsAssertion(assertion)) continue;
        for (const action of assertion.data.actions ?? []) {
            if (
                action.action === "c2pa.created" &&
                action.digitalSourceType === TRAINED_AI
            ) {
                return {
                    classification: "ai-generated",
                    generator: extractGenerator(manifest, manifestId),
                };
            }


            if (
                action.action === "c2pa.edited" &&
                action.digitalSourceType === TRAINED_AI
            ) {
                sawAIEdit = true;
            }
        }
    }

    // 2️⃣ Traverse ingredients
    for (const ingredient of manifest.ingredients ?? []) {
        if (!ingredient.active_manifest) continue;

        const result = classifyManifest(
            store,
            ingredient.active_manifest,
            visited
        );

        if (result.classification === "ai-generated") {
            return result;
        }

        if (result.classification === "ai-assisted") {
            sawAIEdit = true;
        }
    }

    return {
        classification: sawAIEdit ? "ai-assisted" : "non-ai",
    };
}

/* ============================================================
   Public API
   ============================================================ */

export function classifyImageOrigin(
    store: ManifestStore
): {
    classification: OriginClassification;
    aiGenerated: boolean;
    aiGenerator?: AIGeneratorInfo;
} {
    const result = classifyManifest(
        store,
        store.active_manifest,
        new Set()
    );

    return {
        classification: result.classification,
        aiGenerated: result.classification === "ai-generated",
        aiGenerator: result.generator,
    };
}

/* ============================================================
   Example
   ============================================================ */

// const result = classifyImageOrigin(manifestStore);
// result.aiGenerated === true
// result.aiGenerator?.name === "Google" | "OpenAI"


const AI_VENDOR_KEYWORDS: Record<string, readonly string[]> = {
    OpenAI: ["openai", "gpt", "chatgpt"],
    Google: ["google", "gemini", "synthid"],
    Adobe: ["adobe", "firefly"],
    Microsoft: ["microsoft", "bing"]
};

export function normalizeAISourceName(
    info?: AIGeneratorInfo
): string | undefined {
    if (!info?.name) return undefined;

    const normalized = info.name.toLowerCase();

    for (const [vendor, keywords] of Object.entries(AI_VENDOR_KEYWORDS)) {
        for (const keyword of keywords) {
            if (normalized.includes(keyword)) {
                return vendor;
            }
        }
    }

    return info.name;
}

export function formatClassificationLabel(
    value: string
): string {
    return value
        .split("-")
        .map(word => {
            if (word.toLowerCase() === "ai") return "AI";
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}