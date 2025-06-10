import { TopperData, FrameType } from "@/pages/home";

// MediaPipe face detection result type
interface FaceDetection {
  landmarks: Array<{ x: number; y: number; z?: number }>;
  boundingBox: {
    xMin: number;
    yMin: number;
    width: number;
    height: number;
  };
}

// Text style interface
interface TextStyle {
  bold: boolean;
  italic: boolean;
  color: string;
  fontFamily?: string;
}

export function capturePhotoWithAR(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  landmarks: FaceDetection | null,
  topperData: TopperData,
  showTopper: boolean,
  flipHorizontal: boolean,
  flipVertical: boolean
): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Set canvas size to match video's actual resolution
  const videoWidth = video.videoWidth || video.clientWidth;
  const videoHeight = video.videoHeight || video.clientHeight;
  canvas.width = videoWidth;
  canvas.height = videoHeight;

  // Save context state
  ctx.save();

  // Apply transforms
  if (flipHorizontal) {
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
  }
  if (flipVertical) {
    ctx.scale(1, -1);
    ctx.translate(0, -canvas.height);
  }

  // Draw video frame
  ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

  // Draw AR topper if enabled and landmarks detected
  if (showTopper && landmarks && landmarks.landmarks.length > 0) {
    drawARTopper(ctx, landmarks, topperData, canvas.width, canvas.height);
  }

  // Restore context state
  ctx.restore();

  // Return base64 image data
  return canvas.toDataURL('image/png');
}

function drawARTopper(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceDetection,
  topperData: TopperData,
  canvasWidth: number,
  canvasHeight: number
): void {
  // Get forehead position (first landmark in our mock data)
  const foreheadLandmark = landmarks.landmarks[0];
  if (!foreheadLandmark) return;

  const x = foreheadLandmark.x * canvasWidth;
  const y = foreheadLandmark.y * canvasHeight;

  // Calculate topper size based on face bounding box - smaller size
  const faceWidth = landmarks.boundingBox.width * canvasWidth;
  const topperSize = Math.max(faceWidth * 0.4, 30); // Reduced size, minimum 30px

  ctx.save();
  ctx.translate(x, y - topperSize / 2); // Position above forehead

  if (topperData.type === 'emoji') {
    // Draw emoji topper
    ctx.font = `${topperSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(topperData.data, 0, 0);
  } else if (topperData.type === 'upload') {
    // Draw uploaded image topper
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        -topperSize / 2,
        -topperSize / 2,
        topperSize,
        topperSize
      );
    };
    img.src = topperData.data;
  }

  ctx.restore();
}

export async function generateFinalImage(
  canvas: HTMLCanvasElement,
  frameType: FrameType,
  photos: string[],
  text: string,
  textStyle: TextStyle & { fontFamily?: string }
): Promise<string | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Set canvas dimensions based on frame type
  const canvasSize = getCanvasSize(frameType);
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;

  // Clear canvas
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw photos in grid layout and wait for completion
  await drawPhotosInGrid(ctx, photos, frameType, canvas.width, canvas.height);

  // Draw text overlay if provided
  if (text.trim()) {
    drawTextOverlay(ctx, text, textStyle, canvas.width, canvas.height);
  }

  return canvas.toDataURL('image/png');
}

function getCanvasSize(frameType: FrameType): { width: number; height: number } {
  switch (frameType) {
    case '4cut':
      return { width: 400, height: 600 }; // 2x2 grid with extra space for text
    case '2cut':
      return { width: 400, height: 500 }; // 1x2 layout
    case '1cut':
      return { width: 400, height: 450 }; // Single photo with text space
    default:
      return { width: 400, height: 600 };
  }
}

function drawPhotosInGrid(
  ctx: CanvasRenderingContext2D,
  photos: string[],
  frameType: FrameType,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  return new Promise((resolve) => {
    const photoArea = canvasHeight - 100; // Leave 100px for text
    let photoWidth: number, photoHeight: number, cols: number, rows: number;

    switch (frameType) {
      case '4cut':
        cols = 2;
        rows = 2;
        photoWidth = (canvasWidth - 30) / 2; // 10px margin + 10px gap
        photoHeight = (photoArea - 30) / 2;
        break;
      case '2cut':
        cols = 1;
        rows = 2;
        photoWidth = canvasWidth - 20; // 10px margin on each side
        photoHeight = (photoArea - 30) / 2;
        break;
      case '1cut':
        cols = 1;
        rows = 1;
        photoWidth = canvasWidth - 20;
        photoHeight = photoArea - 20;
        break;
      default:
        resolve();
        return;
    }

    let loadedCount = 0;
    const totalPhotos = Math.min(photos.length, cols * rows);

    if (totalPhotos === 0) {
      resolve();
      return;
    }

    photos.slice(0, totalPhotos).forEach((photoData, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const x = 10 + col * (photoWidth + 10);
      const y = 10 + row * (photoHeight + 10);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, x, y, photoWidth, photoHeight);
        loadedCount++;
        if (loadedCount === totalPhotos) {
          resolve();
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalPhotos) {
          resolve();
        }
      };
      img.src = photoData;
    });
  });
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  text: string,
  textStyle: TextStyle,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  // Set font style
  let fontSize = 24;
  let fontWeight = textStyle.bold ? 'bold' : 'normal';
  let fontStyle = textStyle.italic ? 'italic' : 'normal';
  let fontFamily = textStyle.fontFamily || 'Noto Sans KR';
  
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = textStyle.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add text shadow for better readability
  ctx.shadowColor = textStyle.color === '#FFFFFF' ? '#000000' : '#FFFFFF';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Draw text at bottom of canvas
  const textY = canvasHeight - 50;
  ctx.fillText(text, canvasWidth / 2, textY);

  ctx.restore();
}

export async function downloadImage(imageData: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const link = document.createElement('a');
      link.href = imageData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export async function copyImageToClipboard(imageData: string): Promise<void> {
  try {
    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();

    // Use Clipboard API if available
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
    } else {
      throw new Error('Clipboard API not supported');
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
}
