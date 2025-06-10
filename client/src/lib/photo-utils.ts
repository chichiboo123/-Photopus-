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
  topperData: TopperData[],
  showTopper: boolean,
  flipHorizontal: boolean,
  flipVertical: boolean,
  topperCounts?: {[key: string]: number},
  topperPositions?: {[key: string]: {x: number, y: number}},
  topperSize?: number
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

  // Draw AR toppers if enabled and landmarks detected
  if (showTopper && landmarks && landmarks.landmarks.length > 0 && topperData.length > 0) {
    drawMultipleARToppers(ctx, landmarks, topperData, canvas.width, canvas.height, topperCounts, topperPositions, topperSize);
  }

  // Restore context state
  ctx.restore();

  // Return base64 image data
  return canvas.toDataURL('image/png');
}

function drawMultipleARToppers(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceDetection,
  topperData: TopperData[],
  canvasWidth: number,
  canvasHeight: number,
  topperCounts?: {[key: string]: number},
  topperPositions?: {[key: string]: {x: number, y: number}},
  topperSizeMultiplier: number = 1.0
): void {
  const faceBox = landmarks.boundingBox;
  const faceWidth = faceBox.width * canvasWidth;
  const faceHeight = faceBox.height * canvasHeight;
  
  // Base position at the top center of the face
  const baseCenterX = (faceBox.xMin + faceBox.width / 2) * canvasWidth;
  const baseCenterY = faceBox.yMin * canvasHeight - faceHeight * 0.15;
  
  // Calculate topper size based on face width
  const topperSize = Math.max(faceWidth * 0.5, 40);
  
  // Arrange multiple toppers in a semi-circle above the head
  topperData.forEach((topper, index) => {
    const totalToppers = topperData.length;
    const angle = totalToppers > 1 ? (index - (totalToppers - 1) / 2) * 0.5 : 0;
    const radius = totalToppers > 1 ? topperSize * 0.8 : 0;
    
    const topperX = baseCenterX + Math.sin(angle) * radius;
    const topperY = baseCenterY - Math.cos(angle) * radius * 0.3;
    
    // Clamp position to stay within canvas bounds
    const safeX = Math.max(topperSize / 2, Math.min(topperX, canvasWidth - topperSize / 2));
    const safeY = Math.max(topperSize / 2, Math.min(topperY, canvasHeight - topperSize / 2));

    ctx.save();
    ctx.translate(safeX, safeY);

    if (topper.type === 'emoji') {
      ctx.font = `${topperSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(topper.data, 0, 0);
    } else if (topper.type === 'upload') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(
          img,
          -topperSize / 2,
          -topperSize / 2,
          topperSize,
          topperSize
        );
      };
      img.src = topper.data;
    }

    ctx.restore();
  });
}

function drawARTopper(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceDetection,
  topperData: TopperData,
  canvasWidth: number,
  canvasHeight: number
): void {
  // Use face bounding box for better positioning
  const faceBox = landmarks.boundingBox;
  const faceWidth = faceBox.width * canvasWidth;
  const faceHeight = faceBox.height * canvasHeight;
  
  // Position topper at the top center of the face, slightly above
  const topperX = (faceBox.xMin + faceBox.width / 2) * canvasWidth;
  const topperY = faceBox.yMin * canvasHeight - faceHeight * 0.15; // Position above forehead
  
  // Calculate topper size based on face width
  const topperSize = Math.max(faceWidth * 0.5, 40);
  
  // Clamp position to stay within canvas bounds
  const safeX = Math.max(topperSize / 2, Math.min(topperX, canvasWidth - topperSize / 2));
  const safeY = Math.max(topperSize / 2, Math.min(topperY, canvasHeight - topperSize / 2));

  ctx.save();
  ctx.translate(safeX, safeY);

  if (topperData.type === 'emoji') {
    ctx.font = `${topperSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(topperData.data, 0, 0);
  } else if (topperData.type === 'upload') {
    // For photo capture, create image synchronously
    const img = new Image();
    img.crossOrigin = 'anonymous';
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
  textStyle: TextStyle & { fontFamily?: string },
  frameColor: string = '#FFFFFF'
): Promise<string | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Set canvas dimensions based on frame type
  const canvasSize = getCanvasSize(frameType);
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;

  // Clear canvas with selected frame color
  ctx.fillStyle = frameColor;
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
      return { width: 400, height: 700 }; // 2x2 grid with extended space for text
    case '2cut':
      return { width: 400, height: 600 }; // 1x2 layout with extended space
    case '1cut':
      return { width: 400, height: 550 }; // Single photo with extended space
    default:
      return { width: 400, height: 700 };
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
    const photoArea = canvasHeight - 150; // Leave 150px for text area
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
        photoWidth = canvasWidth - 40; // More margin for single photo
        photoHeight = canvasWidth - 40; // Square aspect ratio
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
      
      const x = frameType === '1cut' ? 20 : 10 + col * (photoWidth + 10);
      const y = frameType === '1cut' ? 20 : 10 + row * (photoHeight + 10);

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

  // Draw text in the dedicated frame area below photos
  const photoArea = canvasHeight - 150;
  const textY = photoArea + 75; // Center text in the 150px text area
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
