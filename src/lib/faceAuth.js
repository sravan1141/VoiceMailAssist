/**
 * faceAuth.js — Real face recognition using face-api.js (npm package)
 * Models loaded from /models/ (public/models/ in Vite)
 */
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
let modelsLoaded = false;
let loadingPromise = null;

/** Load face-api models once — caches the promise so concurrent calls are safe */
export async function loadFaceModels() {
    if (modelsLoaded) return;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
    })();

    return loadingPromise;
}

/**
 * Capture a 128-float face descriptor from a running <video> element.
 * Returns Float32Array or null if no face is detected.
 */
export async function captureFaceDescriptor(videoEl) {
    await loadFaceModels();

    const detection = await faceapi
        .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

    if (!detection) return null;
    return detection.descriptor; // Float32Array(128)
}

/**
 * Compare a live descriptor against a stored base64-encoded descriptor.
 * Returns true if Euclidean distance < threshold (0.5 is standard).
 */
export function matchFaceDescriptor(liveDescriptor, storedBase64, threshold = 0.5) {
    try {
        const stored = base64ToFloat32(storedBase64);
        const dist = euclideanDistance(liveDescriptor, stored);
        console.log('[faceAuth] match distance:', dist, '(threshold:', threshold, ')');
        return dist < threshold;
    } catch (e) {
        console.error('[faceAuth] match error:', e);
        return false;
    }
}

/** Serialize Float32Array → base64 string */
export function descriptorToBase64(descriptor) {
    const bytes = new Uint8Array(descriptor.buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
}

/** Deserialize base64 string → Float32Array */
export function base64ToFloat32(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Float32Array(bytes.buffer);
}

function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
}
