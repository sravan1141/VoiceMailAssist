/**
 * voiceAuth.js — Speaker verification using Web Audio API
 * Records audio, extracts a spectral fingerprint (Mel-frequency energy bands),
 * and compares against stored fingerprint via cosine similarity.
 * No external library required — purely Web Audio API.
 */

const SAMPLE_RATE = 16000;
const N_MELS = 40;
const RECORD_DURATION_MS = 3000;

const workletCode = `
class RecorderWorkletProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channelData = input[0];
            if (channelData) {
                this.port.postMessage(new Float32Array(channelData));
            }
        }
        return true;
    }
}
registerProcessor('recorder-worklet', RecorderWorkletProcessor);
`;

/**
 * Record audio from the microphone for \`durationMs\` milliseconds.
 * Returns AudioBuffer.
 */
export async function recordAudio(durationMs = RECORD_DURATION_MS) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    const source = audioCtx.createMediaStreamSource(stream);
    const chunks = [];

    return new Promise(async (resolve, reject) => {
        try {
            if (audioCtx.audioWorklet) {
                const blob = new Blob([workletCode], { type: 'application/javascript' });
                const blobUrl = URL.createObjectURL(blob);
                await audioCtx.audioWorklet.addModule(blobUrl);

                const workletNode = new AudioWorkletNode(audioCtx, 'recorder-worklet');
                workletNode.port.onmessage = (e) => {
                    chunks.push(e.data);
                };

                source.connect(workletNode);
                workletNode.connect(audioCtx.destination);

                setTimeout(() => {
                    source.disconnect();
                    workletNode.disconnect();
                    stream.getTracks().forEach((t) => t.stop());
                    audioCtx.close();
                    URL.revokeObjectURL(blobUrl);

                    const totalLength = chunks.reduce((s, c) => s + c.length, 0);
                    const merged = new Float32Array(totalLength);
                    let offset = 0;
                    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }

                    resolve(merged);
                }, durationMs);
            } else {
                // Fallback for older browsers
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);

                processor.onaudioprocess = (e) => {
                    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
                };
                source.connect(processor);
                processor.connect(audioCtx.destination);

                setTimeout(() => {
                    source.disconnect();
                    processor.disconnect();
                    stream.getTracks().forEach((t) => t.stop());
                    audioCtx.close();

                    const totalLength = chunks.reduce((s, c) => s + c.length, 0);
                    const merged = new Float32Array(totalLength);
                    let offset = 0;
                    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }

                    resolve(merged);
                }, durationMs);
            }
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Extract a spectral fingerprint from raw PCM samples.
 * Returns Float32Array of length N_MELS (energy per frequency band).
 */
export function extractFingerprint(pcmSamples) {
    const frameSize = 512;
    const hopSize = 256;
    const energyBands = new Float32Array(N_MELS).fill(0);
    let frameCount = 0;

    for (let start = 0; start + frameSize <= pcmSamples.length; start += hopSize) {
        const frame = pcmSamples.slice(start, start + frameSize);
        // Apply Hann window
        const windowed = frame.map((s, i) => s * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frameSize)));
        // FFT via DFT (simplified — for real use face-api's internal tf or a lib)
        const spectrum = simpleDFTMagnitude(windowed, N_MELS);
        for (let k = 0; k < N_MELS; k++) energyBands[k] += spectrum[k];
        frameCount++;
    }
    if (frameCount > 0) for (let k = 0; k < N_MELS; k++) energyBands[k] /= frameCount;
    return energyBands;
}

/**
 * Simple DFT to get magnitude at `bins` evenly spaced frequencies.
 */
function simpleDFTMagnitude(samples, bins) {
    const N = samples.length;
    const result = new Float32Array(bins);
    const step = Math.floor(N / 2 / bins);
    for (let b = 0; b < bins; b++) {
        const k = b * step + 1;
        let real = 0, imag = 0;
        for (let n = 0; n < N; n++) {
            const angle = (2 * Math.PI * k * n) / N;
            real += samples[n] * Math.cos(angle);
            imag -= samples[n] * Math.sin(angle);
        }
        result[b] = Math.sqrt(real * real + imag * imag) / N;
    }
    return result;
}

/**
 * Cosine similarity between two Float32Arrays.
 * Returns number in [-1, 1]; > 0.75 is considered a match.
 */
export function cosineSimiliarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Serialize Float32Array to base64 */
export function fingerprintToBase64(fp) {
    const bytes = new Uint8Array(fp.buffer);
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
}

/** Deserialize base64 to Float32Array */
export function base64ToFingerprint(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Float32Array(bytes.buffer);
}

/**
 * Compare a live recording fingerprint against a stored base64 fingerprint.
 * Threshold 0.75 works well for the same speaker.
 */
export function matchVoiceFingerprint(liveFingerprint, storedBase64, threshold = 0.75) {
    try {
        const stored = base64ToFingerprint(storedBase64);
        const sim = cosineSimiliarity(liveFingerprint, stored);
        console.log('[voiceAuth] voice similarity:', sim);
        return sim >= threshold;
    } catch {
        return false;
    }
}
