// src/components/ai/VirtualTryOn.tsx
// Client-side virtual try-on using MediaPipe Pose + Canvas overlay.
// No server needed — runs entirely in the browser.

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Camera, Upload, X, RefreshCw, Info, Loader2 } from "lucide-react";

interface VirtualTryOnProps {
  productImage: string;   // URL of the product (should be a transparent-bg PNG ideally)
  productName: string;
}

type Mode = "idle" | "camera" | "upload" | "processing" | "result" | "error";

interface TryOnResult {
  canvas: HTMLCanvasElement;
  confidence: number;
}

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({
  productImage,
  productName,
}) => {
  const [mode, setMode] = useState<Mode>("idle");
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaPipeReady, setMediaPipeReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);

  // ── Load MediaPipe Pose dynamically ──────────────────────────────────────
  useEffect(() => {
    const loadMediaPipe = async () => {
      try {
        // @ts-ignore
        if (typeof window !== "undefined" && !window.Pose) {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js";
          script.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load MediaPipe"));
            document.head.appendChild(script);
          });
        }
        setMediaPipeReady(true);
      } catch {
        // MediaPipe failed to load, will fall back to simple overlay
        setMediaPipeReady(false);
      }
    };
    loadMediaPipe();
  }, []);

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode("camera");
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions and try again.");
      setMode("error");
    }
  };

  // ── Capture from camera ───────────────────────────────────────────────────
  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;

    // Mirror the image (selfie mode)
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    stopCamera();
    await processImage(canvas);
  };

  // ── Handle file upload ────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      setMode("error");
      return;
    }

    setMode("processing");
    const img = new Image();
    img.onload = async () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      await processImage(canvas);
    };
    img.src = URL.createObjectURL(file);
  };

  // ── Core: Detect pose + overlay product ──────────────────────────────────
  const processImage = async (sourceCanvas: HTMLCanvasElement) => {
    setMode("processing");

    try {
      let torsoRect = await detectTorso(sourceCanvas);
      await overlayProduct(sourceCanvas, torsoRect);
    } catch (err) {
      setError("Could not process image. Try with a clearer, well-lit photo.");
      setMode("error");
    }
  };

  // Detect torso using MediaPipe Pose or fallback heuristic
  const detectTorso = async (
    canvas: HTMLCanvasElement
  ): Promise<{ x: number; y: number; width: number; height: number }> => {
    const w = canvas.width;
    const h = canvas.height;

    // @ts-ignore
    if (mediaPipeReady && typeof window.Pose !== "undefined") {
      return new Promise((resolve) => {
        // @ts-ignore
        const pose = new window.Pose({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results: any) => {
          if (results.poseLandmarks) {
            const lm = results.poseLandmarks;
            // Landmarks: 11=left_shoulder, 12=right_shoulder, 23=left_hip, 24=right_hip
            const leftShoulder = lm[11];
            const rightShoulder = lm[12];
            const leftHip = lm[23];
            const rightHip = lm[24];

            if (leftShoulder && rightShoulder && leftHip && rightHip) {
              const minX = Math.min(rightShoulder.x, leftHip.x) * w * 0.85;
              const maxX = Math.max(leftShoulder.x, rightHip.x) * w * 1.15;
              const minY = Math.min(leftShoulder.y, rightShoulder.y) * h * 0.9;
              const maxY = Math.max(leftHip.y, rightHip.y) * h * 1.05;

              setConfidence(Math.round((leftShoulder.visibility || 0.8) * 100));
              resolve({
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
              });
              return;
            }
          }
          // Fallback if landmarks not detected
          resolve(fallbackTorso(w, h));
        });

        pose.send({ image: canvas }).catch(() => resolve(fallbackTorso(w, h)));
      });
    }

    // Pure heuristic fallback
    return fallbackTorso(w, h);
  };

  // Heuristic: assume torso occupies center 40-80% of image
  const fallbackTorso = (w: number, h: number) => {
    setConfidence(60);
    return {
      x: w * 0.2,
      y: h * 0.15,
      width: w * 0.6,
      height: h * 0.55,
    };
  };

  // Overlay product image on detected torso region
  const overlayProduct = async (
    sourceCanvas: HTMLCanvasElement,
    torso: { x: number; y: number; width: number; height: number }
  ) => {
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height;
    const ctx = outputCanvas.getContext("2d")!;

    // Draw original photo
    ctx.drawImage(sourceCanvas, 0, 0);

    // Load product image
    const productImg = await loadImage(productImage);

    // Draw product with slight transparency for natural look
    ctx.globalAlpha = 0.82;
    ctx.drawImage(productImg, torso.x, torso.y, torso.width, torso.height);
    ctx.globalAlpha = 1.0;

    // Add subtle vignette blend around edges
    const gradient = ctx.createRadialGradient(
      torso.x + torso.width / 2,
      torso.y + torso.height / 2,
      Math.min(torso.width, torso.height) * 0.3,
      torso.x + torso.width / 2,
      torso.y + torso.height / 2,
      Math.max(torso.width, torso.height) * 0.7
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(torso.x, torso.y, torso.width, torso.height);

    setResultDataUrl(outputCanvas.toDataURL("image/jpeg", 0.92));
    setMode("result");
  };

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const reset = () => {
    stopCamera();
    setMode("idle");
    setResultDataUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Virtual Try-On ✨</h3>
            <p className="text-violet-100 text-xs mt-0.5">
              See how {productName} looks on you
            </p>
          </div>
          {mode !== "idle" && (
            <button
              onClick={reset}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* ── Idle: Choose input method ───────────────────────────────── */}
        {mode === "idle" && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                For best results, use a full-body or upper-body photo with a clear background.
                All processing happens on your device — your photos are never uploaded.
              </p>
            </div>

            <button
              onClick={startCamera}
              className="w-full flex items-center gap-3 p-4 border-2 border-dashed 
                border-violet-200 rounded-xl hover:border-violet-400 hover:bg-violet-50 
                transition-all group"
            >
              <div className="w-10 h-10 bg-violet-100 group-hover:bg-violet-200 rounded-xl 
                flex items-center justify-center flex-shrink-0 transition-colors">
                <Camera size={20} className="text-violet-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 text-sm">Use Camera</p>
                <p className="text-xs text-gray-500">Take a photo right now</p>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-4 border-2 border-dashed 
                border-pink-200 rounded-xl hover:border-pink-400 hover:bg-pink-50 
                transition-all group"
            >
              <div className="w-10 h-10 bg-pink-100 group-hover:bg-pink-200 rounded-xl 
                flex items-center justify-center flex-shrink-0 transition-colors">
                <Upload size={20} className="text-pink-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 text-sm">Upload Photo</p>
                <p className="text-xs text-gray-500">JPG, PNG supported</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* ── Camera viewfinder ────────────────────────────────────────── */}
        {mode === "camera" && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                muted
                playsInline
              />
              {/* Pose guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-32 h-48 border-2 border-white/50 rounded-full opacity-60" />
              </div>
              <p className="absolute bottom-2 left-0 right-0 text-center text-white/70 text-xs">
                Position yourself in the frame
              </p>
            </div>
            <button
              onClick={captureFromCamera}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold 
                py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Camera size={18} />
              Capture & Try On
            </button>
          </div>
        )}

        {/* ── Processing ───────────────────────────────────────────────── */}
        {mode === "processing" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 size={40} className="text-violet-600 animate-spin" />
            <p className="font-medium text-gray-700">Detecting pose...</p>
            <p className="text-sm text-gray-400">Placing product on your photo</p>
          </div>
        )}

        {/* ── Result ───────────────────────────────────────────────────── */}
        {mode === "result" && resultDataUrl && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={resultDataUrl}
                alt="Virtual try-on result"
                className="w-full rounded-xl"
              />
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs 
                px-2.5 py-1 rounded-full">
                {confidence}% confidence
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs text-amber-700">
                This is a preview overlay. Actual fit may vary. Use our{" "}
                <a href="#size-guide" className="underline font-medium">size guide</a>{" "}
                to find your perfect fit.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 border-2 
                  border-gray-200 text-gray-700 py-3 rounded-xl font-medium 
                  hover:border-gray-300 transition-colors text-sm"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <a
                href={resultDataUrl}
                download="try-on-result.jpg"
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 
                  hover:bg-violet-700 text-white py-3 rounded-xl font-medium 
                  transition-colors text-sm"
              >
                Save Photo
              </a>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {mode === "error" && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={reset}
              className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl 
                font-medium hover:border-gray-300 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
