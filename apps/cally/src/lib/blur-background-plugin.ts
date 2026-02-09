/**
 * Lightweight Blur Background Plugin
 *
 * Custom implementation using MediaPipe SelfieSegmentation loaded via CDN
 * to avoid bundler compatibility issues with Next.js 15/Turbopack
 */

import type {
  HMSVideoPlugin,
  HMSPluginSupportResult,
} from "@100mslive/hms-video-store";
import { HMSVideoPluginType } from "@100mslive/hms-video-store";

// HMSPluginUnsupportedTypes enum values - using type assertion to match SDK enum
// The SDK defines these as enum values, we replicate them here
type HMSPluginUnsupportedTypesEnum =
  | "PLATFORM_NOT_SUPPORTED"
  | "DEVICE_NOT_SUPPORTED";
const HMSPluginUnsupportedTypes: Record<
  HMSPluginUnsupportedTypesEnum,
  HMSPluginUnsupportedTypesEnum
> = {
  PLATFORM_NOT_SUPPORTED: "PLATFORM_NOT_SUPPORTED",
  DEVICE_NOT_SUPPORTED: "DEVICE_NOT_SUPPORTED",
};

// MediaPipe types (loaded dynamically)
interface SelfieSegmentationResults {
  segmentationMask: ImageBitmap | HTMLCanvasElement;
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

interface SelfieSegmentationConfig {
  locateFile: (file: string) => string;
}

interface SelfieSegmentation {
  setOptions: (options: {
    modelSelection: number;
    selfieMode: boolean;
  }) => void;
  onResults: (callback: (results: SelfieSegmentationResults) => void) => void;
  send: (input: { image: HTMLCanvasElement }) => Promise<void>;
  close: () => void;
}

declare global {
  interface Window {
    SelfieSegmentation: new (
      config: SelfieSegmentationConfig,
    ) => SelfieSegmentation;
  }
}

// Load MediaPipe script from CDN
let mediapipeLoaded = false;
let mediapipeLoadPromise: Promise<void> | null = null;

function loadMediaPipeScript(): Promise<void> {
  if (mediapipeLoaded) return Promise.resolve();
  if (mediapipeLoadPromise) return mediapipeLoadPromise;

  mediapipeLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.SelfieSegmentation) {
      mediapipeLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/selfie_segmentation.js";
    script.crossOrigin = "anonymous";

    script.onload = () => {
      console.log("[DBG][BlurPlugin] MediaPipe script loaded");
      mediapipeLoaded = true;
      resolve();
    };

    script.onerror = () => {
      console.error("[DBG][BlurPlugin] Failed to load MediaPipe script");
      mediapipeLoadPromise = null;
      reject(new Error("Failed to load MediaPipe"));
    };

    document.head.appendChild(script);
  });

  return mediapipeLoadPromise;
}

/**
 * Lightweight blur background plugin for 100ms
 * Implements HMSVideoPlugin interface
 */
export class BlurBackgroundPlugin implements HMSVideoPlugin {
  private segmentation: SelfieSegmentation | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputCtx: CanvasRenderingContext2D | null = null;
  private lastResults: SelfieSegmentationResults | null = null;
  private isInitialized = false;
  private blurAmount = 10; // pixels
  private isProcessing = false;

  constructor(blurAmount = 10) {
    this.blurAmount = blurAmount;
    console.log("[DBG][BlurPlugin] Plugin created with blur:", blurAmount);
  }

  getName(): string {
    return "BlurBackgroundPlugin";
  }

  getPluginType(): HMSVideoPluginType {
    return HMSVideoPluginType.TRANSFORM;
  }

  isSupported(): boolean {
    // Check for required browser features
    const hasCanvas = typeof HTMLCanvasElement !== "undefined";
    const hasOffscreenCanvas =
      typeof OffscreenCanvas !== "undefined" ||
      typeof HTMLCanvasElement !== "undefined";
    const isChromium =
      navigator.userAgent.includes("Chrome") ||
      navigator.userAgent.includes("Edg") ||
      navigator.userAgent.includes("Edge");
    const isFirefox = navigator.userAgent.includes("Firefox");
    const isSafari =
      navigator.userAgent.includes("Safari") &&
      !navigator.userAgent.includes("Chrome");

    // Safari has issues with MediaPipe WASM
    if (isSafari) {
      console.log("[DBG][BlurPlugin] Safari not supported");
      return false;
    }

    return hasCanvas && hasOffscreenCanvas && (isChromium || isFirefox);
  }

  checkSupport(): HMSPluginSupportResult {
    if (!this.isSupported()) {
      return {
        isSupported: false,
        // Type assertion needed - SDK expects enum but we use string literal
        errType:
          HMSPluginUnsupportedTypes.PLATFORM_NOT_SUPPORTED as HMSPluginSupportResult["errType"],
        errMsg: "Blur background requires Chrome, Edge, or Firefox on desktop",
      };
    }
    return { isSupported: true };
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    console.log("[DBG][BlurPlugin] Initializing...");

    try {
      // Load MediaPipe from CDN
      await loadMediaPipeScript();

      // Create segmentation instance
      this.segmentation = new window.SelfieSegmentation({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`,
      });

      // Use model 1 (landscape) - faster than model 0
      this.segmentation.setOptions({
        modelSelection: 1,
        selfieMode: false,
      });

      // Set up results handler
      this.segmentation.onResults((results: SelfieSegmentationResults) => {
        this.lastResults = results;
      });

      this.isInitialized = true;
      console.log("[DBG][BlurPlugin] Initialized successfully");
    } catch (err) {
      console.error("[DBG][BlurPlugin] Init failed:", err);
      throw err;
    }
  }

  async processVideoFrame(
    input: HTMLCanvasElement,
    output: HTMLCanvasElement,
    skipProcessing?: boolean,
  ): Promise<void> {
    if (!input || !output) return;

    // Get output context
    if (!this.outputCtx || this.outputCanvas !== output) {
      this.outputCanvas = output;
      this.outputCtx = output.getContext("2d");
    }

    if (!this.outputCtx) return;

    // Match output size to input
    if (output.width !== input.width) output.width = input.width;
    if (output.height !== input.height) output.height = input.height;

    // If skipping or no segmentation ready, just copy input
    if (skipProcessing || !this.segmentation || !this.isInitialized) {
      this.outputCtx.drawImage(input, 0, 0);
      return;
    }

    // Use cached results if still processing
    if (this.isProcessing && this.lastResults) {
      this.renderWithBlur(input, this.lastResults);
      return;
    }

    // Run segmentation
    try {
      this.isProcessing = true;
      await this.segmentation.send({ image: input });

      // Render with blur if we have results
      if (this.lastResults) {
        this.renderWithBlur(input, this.lastResults);
      } else {
        // Fallback: just copy input
        this.outputCtx.drawImage(input, 0, 0);
      }
    } catch (err) {
      console.error("[DBG][BlurPlugin] Process error:", err);
      // Fallback: just copy input
      this.outputCtx.drawImage(input, 0, 0);
    } finally {
      this.isProcessing = false;
    }
  }

  private renderWithBlur(
    input: HTMLCanvasElement,
    results: SelfieSegmentationResults,
  ): void {
    if (!this.outputCtx || !this.outputCanvas) return;

    const ctx = this.outputCtx;
    const width = this.outputCanvas.width;
    const height = this.outputCanvas.height;

    // Save context state
    ctx.save();

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Step 1: Draw blurred background
    ctx.filter = `blur(${this.blurAmount}px)`;
    ctx.drawImage(input, 0, 0, width, height);
    ctx.filter = "none";

    // Step 2: Use segmentation mask to draw sharp person
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(results.segmentationMask, 0, 0, width, height);

    // Step 3: Draw original person on top
    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(input, 0, 0, width, height);

    // Restore context
    ctx.restore();
  }

  setBlurAmount(amount: number): void {
    this.blurAmount = Math.max(0, Math.min(30, amount)); // Clamp 0-30
    console.log("[DBG][BlurPlugin] Blur set to:", this.blurAmount);
  }

  stop(): void {
    console.log("[DBG][BlurPlugin] Stopping...");
    if (this.segmentation) {
      try {
        this.segmentation.close();
      } catch (_e) {
        // Ignore close errors
      }
      this.segmentation = null;
    }
    this.lastResults = null;
    this.isInitialized = false;
    this.outputCanvas = null;
    this.outputCtx = null;
  }
}

// Singleton loader for easy access
let pluginInstance: BlurBackgroundPlugin | null = null;

export async function getBlurPlugin(
  blurAmount = 10,
): Promise<BlurBackgroundPlugin | null> {
  if (typeof window === "undefined") return null;

  if (!pluginInstance) {
    pluginInstance = new BlurBackgroundPlugin(blurAmount);
  }

  if (!pluginInstance.isSupported()) {
    console.log("[DBG][BlurPlugin] Not supported on this browser");
    return null;
  }

  try {
    await pluginInstance.init();
    return pluginInstance;
  } catch (err) {
    console.error("[DBG][BlurPlugin] Failed to get plugin:", err);
    return null;
  }
}

export function disposeBlurPlugin(): void {
  if (pluginInstance) {
    pluginInstance.stop();
    pluginInstance = null;
  }
}
