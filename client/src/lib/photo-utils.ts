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
  // Create expanded toppers array based on counts and user positions
  const expandedToppers: { topper: TopperData; instanceIndex: number; id: string }[] = [];
  
  topperData.forEach((topper) => {
    const count = topperCounts?.[topper.id] ?? 1;
    for (let i = 0; i < count; i++) {
      expandedToppers.push({
        topper,
        instanceIndex: i,
        id: `${topper.id}_${i}`
      });
    }
  });

  const faceBox = landmarks.boundingBox;
  const faceWidth = faceBox.width * canvasWidth;
  
  // Calculate topper size using user-set multiplier
  const baseTopperSize = Math.max(faceWidth * 0.4, 30);
  const finalTopperSize = baseTopperSize * (topperSizeMultiplier || 1.0);
  
  expandedToppers.forEach(({ topper, instanceIndex, id }) => {
    // Use exact user-set position if available
    let topperX, topperY;
    
    if (topperPositions?.[id]) {
      // Convert preview coordinates to capture canvas coordinates
      const userPos = topperPositions[id];
      topperX = userPos.x * canvasWidth;
      topperY = userPos.y * canvasHeight;
    } else {
      // Default positioning as fallback
      const baseCenterX = (faceBox.xMin + faceBox.width / 2) * canvasWidth;
      const baseCenterY = faceBox.yMin * canvasHeight - faceWidth * 0.15;
      
      const angle = instanceIndex * 0.3;
      const radius = finalTopperSize * 0.8;
      topperX = baseCenterX + Math.sin(angle) * radius;
      topperY = baseCenterY - Math.cos(angle) * radius * 0.3;
    }
    
    // Ensure toppers stay within canvas bounds
    const safeX = Math.max(finalTopperSize / 2, Math.min(topperX, canvasWidth - finalTopperSize / 2));
    const safeY = Math.max(finalTopperSize / 2, Math.min(topperY, canvasHeight - finalTopperSize / 2));

    ctx.save();
    ctx.translate(safeX, safeY);

    if (topper.type === 'emoji') {
      ctx.font = `${finalTopperSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(topper.data, 0, 0);
    } else if (topper.type === 'upload') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(
          img,
          -finalTopperSize / 2,
          -finalTopperSize / 2,
          finalTopperSize,
          finalTopperSize
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

// Helper function to get photo aspect ratio
async function getPhotoAspectRatio(photoDataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.width / img.height);
    };
    img.onerror = () => {
      resolve(4 / 3); // Default fallback
    };
    img.src = photoDataUrl;
  });
}

export async function generateFinalImage(
  canvas: HTMLCanvasElement,
  frameType: FrameType,
  photos: string[],
  text: string,
  textStyle: TextStyle & { fontFamily?: string },
  frameColor: string = '#FFFFFF',
  captureAspectRatio?: number
): Promise<string | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Detect aspect ratio from first photo if not provided
  let aspectRatio = captureAspectRatio;
  if (!aspectRatio && photos.length > 0) {
    aspectRatio = await getPhotoAspectRatio(photos[0]);
  }

  // Set canvas dimensions based on frame type and aspect ratio
  const canvasSize = getCanvasSize(frameType, aspectRatio);
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;

  // Clear canvas with selected frame color
  ctx.fillStyle = frameColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw photos in grid layout and wait for completion
  await drawPhotosInGrid(ctx, photos, frameType, canvas.width, canvas.height, aspectRatio);

  // Draw text overlay if provided
  if (text.trim()) {
    drawTextOverlay(ctx, text, textStyle, canvas.width, canvas.height, frameType);
  }

  return canvas.toDataURL('image/png');
}

function getCanvasSize(frameType: FrameType, aspectRatio: number = 4/3): { width: number; height: number } {
  const isVertical = aspectRatio < 1;
  const textAreaHeight = 80; // Reduced text area height
  
  // Base dimensions that work well for photos
  const basePhotoSize = 300;
  
  switch (frameType) {
    case '4cut': {
      if (isVertical) {
        // Vertical: 2x2 grid
        const photoWidth = basePhotoSize * aspectRatio;
        const photoHeight = basePhotoSize;
        return {
          width: (photoWidth * 2) + 30, // 2 photos wide + margins
          height: (photoHeight * 2) + 30 + textAreaHeight
        };
      } else {
        // Horizontal: 2x2 grid
        const photoWidth = basePhotoSize;
        const photoHeight = basePhotoSize / aspectRatio;
        return {
          width: (photoWidth * 2) + 30,
          height: (photoHeight * 2) + 30 + textAreaHeight
        };
      }
    }
    case '2cut': {
      // Always use vertical stacking for 2-cut photos
      const photoWidth = basePhotoSize * (isVertical ? aspectRatio : 1);
      const photoHeight = basePhotoSize * (isVertical ? 1 : 1/aspectRatio);
      return {
        width: photoWidth + 20,
        height: (photoHeight * 2) + 30 + textAreaHeight
      };
    }
    case '1cut': {
      // Maintain proper aspect ratio for 1-cut photos
      let photoWidth, photoHeight;
      if (isVertical) {
        // For vertical videos, maintain aspect ratio
        photoHeight = basePhotoSize;
        photoWidth = photoHeight * aspectRatio;
      } else {
        // For horizontal videos, maintain aspect ratio
        photoWidth = basePhotoSize;
        photoHeight = photoWidth / aspectRatio;
      }
      return {
        width: photoWidth + 40,
        height: photoHeight + 80 // Space for text below photo
      };
    }
    default:
      return { width: 400, height: 700 };
  }
}

function drawPhotosInGrid(
  ctx: CanvasRenderingContext2D,
  photos: string[],
  frameType: FrameType,
  canvasWidth: number,
  canvasHeight: number,
  aspectRatio: number = 4/3
): Promise<void> {
  return new Promise((resolve) => {
    const photoArea = canvasHeight - 80; // Leave 80px for text area (reduced)
    const isVertical = aspectRatio < 1;
    let photoWidth: number, photoHeight: number, cols: number, rows: number;

    switch (frameType) {
      case '4cut':
        cols = 2;
        rows = 2;
        photoWidth = (canvasWidth - 30) / 2; // 10px margin + 10px gap
        photoHeight = (photoArea - 30) / 2;
        break;
      case '2cut':
        // Always stack vertically for 2-cut photos
        cols = 1;
        rows = 2;
        photoWidth = canvasWidth - 20;
        photoHeight = (photoArea - 30) / 2;
        break;
      case '1cut':
        cols = 1;
        rows = 1;
        // For 1-cut photos, reserve space for text below
        photoWidth = canvasWidth - 40;
        photoHeight = canvasHeight - 80; // Reserve 40px margin + 40px for text
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
  canvasWidth: number,
  canvasHeight: number,
  textStyle: TextStyle,
  frameType: FrameType
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
  let textY;
  if (frameType === '1cut') {
    // For 1-cut photos, place text in the reserved space below the photo
    textY = canvasHeight - 30; // 30px from bottom
  } else {
    // For multi-cut photos, use the dedicated text area
    const photoArea = canvasHeight - 80;
    textY = photoArea + 40; // Center text in the 80px text area
  }
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
