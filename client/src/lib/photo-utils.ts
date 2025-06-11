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

// Helper function to adjust landmarks for flip transforms
function adjustLandmarksForFlip(
  landmarks: FaceDetection,
  flipHorizontal: boolean,
  flipVertical: boolean,
  canvasWidth: number,
  canvasHeight: number
): FaceDetection {
  if (!flipHorizontal && !flipVertical) {
    return landmarks;
  }

  const adjustedLandmarks = { ...landmarks };
  
  // Adjust bounding box
  let { xMin, yMin, width, height } = landmarks.boundingBox;
  
  if (flipHorizontal) {
    xMin = 1 - xMin - width;
  }
  if (flipVertical) {
    yMin = 1 - yMin - height;
  }
  
  adjustedLandmarks.boundingBox = { xMin, yMin, width, height };
  
  // Adjust individual landmarks
  adjustedLandmarks.landmarks = landmarks.landmarks.map(point => {
    let { x, y, z } = point;
    
    if (flipHorizontal) {
      x = 1 - x;
    }
    if (flipVertical) {
      y = 1 - y;
    }
    
    return { x, y, z };
  });
  
  return adjustedLandmarks;
}

export async function capturePhotoWithAR(
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
): Promise<string | null> {
  if (!video.videoWidth || !video.videoHeight) return null;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Create a temporary canvas for capture to avoid interference with the display canvas
  const captureCanvas = document.createElement('canvas');
  const captureCtx = captureCanvas.getContext('2d');
  if (!captureCtx) return null;

  // Set capture canvas size to match video's actual resolution
  const videoWidth = video.videoWidth || video.clientWidth;
  const videoHeight = video.videoHeight || video.clientHeight;
  captureCanvas.width = videoWidth;
  captureCanvas.height = videoHeight;

  // Clear capture canvas
  captureCtx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);

  // Step 1: Draw video frame with transforms
  console.log('Step 1: Drawing video frame', { videoWidth, videoHeight, flipHorizontal, flipVertical });
  captureCtx.save();
  if (flipHorizontal) {
    captureCtx.scale(-1, 1);
    captureCtx.translate(-captureCanvas.width, 0);
  }
  if (flipVertical) {
    captureCtx.scale(1, -1);
    captureCtx.translate(0, -captureCanvas.height);
  }
  captureCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
  captureCtx.restore();
  console.log('Step 1 completed: Video frame drawn');

  // Step 2: Draw AR toppers on top (without transforms, using adjusted landmarks)
  if (showTopper && landmarks && landmarks.landmarks.length > 0 && topperData.length > 0) {
    console.log('Step 2: Drawing toppers', { 
      showTopper, 
      landmarksCount: landmarks.landmarks.length, 
      topperCount: topperData.length,
      topperData: topperData.map(t => ({ type: t.type, id: t.id }))
    });
    const adjustedLandmarks = adjustLandmarksForFlip(landmarks, flipHorizontal, flipVertical, captureCanvas.width, captureCanvas.height);
    await drawMultipleARToppers(captureCtx, adjustedLandmarks, topperData, captureCanvas.width, captureCanvas.height, topperCounts, topperPositions, topperSize);
    console.log('Step 2 completed: Toppers drawn');
  } else {
    console.log('Step 2 skipped:', { showTopper, hasLandmarks: !!landmarks, landmarksLength: landmarks?.landmarks.length, topperCount: topperData.length });
  }

  // Return base64 image data from capture canvas
  return captureCanvas.toDataURL('image/png');
}

async function drawMultipleARToppers(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceDetection,
  topperData: TopperData[],
  canvasWidth: number,
  canvasHeight: number,
  topperCounts?: {[key: string]: number},
  topperPositions?: {[key: string]: {x: number, y: number}},
  topperSize?: number
): Promise<void> {
  // Get all topper instances to render
  const expandedToppers: { topper: TopperData; instanceIndex: number; id: string }[] = [];
  
  topperData.forEach(topper => {
    const count = topperCounts?.[topper.id] || topper.count || 1;
    for (let i = 0; i < count; i++) {
      expandedToppers.push({
        topper,
        instanceIndex: i,
        id: `${topper.id}_${i}`
      });
    }
  });

  // Create promises for all toppers to ensure proper async handling
  const topperPromises = expandedToppers.map(async ({ topper, instanceIndex, id }) => {
    await drawARTopper(ctx, landmarks, topper, canvasWidth, canvasHeight, topperPositions?.[id], topperSize);
  });

  // Wait for all toppers to be drawn
  await Promise.all(topperPromises);
}

async function drawARTopper(
  ctx: CanvasRenderingContext2D,
  landmarks: FaceDetection,
  topperData: TopperData,
  canvasWidth: number,
  canvasHeight: number,
  customPosition?: {x: number, y: number},
  customSize?: number
): Promise<void> {
  if (landmarks.landmarks.length === 0) return;

  // Get topper position and size
  let topperX, topperY, topperSize;
  
  if (customPosition) {
    topperX = customPosition.x * canvasWidth;
    topperY = customPosition.y * canvasHeight;
  } else {
    // Default to forehead position (top center of face)
    const topPoint = landmarks.landmarks[10] || landmarks.landmarks[0];
    topperX = topPoint.x * canvasWidth;
    topperY = topPoint.y * canvasHeight - 50; // Slightly above the landmark
  }

  topperSize = customSize || Math.min(canvasWidth, canvasHeight) * 0.15;

  // Clamp position to stay within canvas bounds
  const safeX = Math.max(topperSize / 2, Math.min(topperX, canvasWidth - topperSize / 2));
  const safeY = Math.max(topperSize / 2, Math.min(topperY, canvasHeight - topperSize / 2));

  if (topperData.type === 'emoji') {
    ctx.save();
    ctx.translate(safeX, safeY);
    ctx.font = `${topperSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(topperData.data, 0, 0);
    ctx.restore();
  } else if (topperData.type === 'upload') {
    // Create image and wait for it to load completely before drawing
    console.log('Drawing upload topper:', { id: topperData.id, dataLength: topperData.data.length });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const imageLoaded = new Promise<boolean>((resolve) => {
      img.onload = () => {
        console.log('Upload topper image loaded successfully:', { id: topperData.id, width: img.width, height: img.height });
        resolve(true);
      };
      img.onerror = () => {
        console.error('Failed to load topper image:', topperData.data);
        resolve(false);
      };
      img.src = topperData.data;
    });

    const loaded = await imageLoaded;
    if (loaded && img.complete) {
      console.log('Drawing upload topper at position:', { safeX, safeY, topperSize });
      ctx.save();
      ctx.translate(safeX, safeY);
      try {
        ctx.drawImage(
          img,
          -topperSize / 2,
          -topperSize / 2,
          topperSize,
          topperSize
        );
        console.log('Upload topper drawn successfully');
      } catch (error) {
        console.error('Error drawing topper image:', error);
      }
      ctx.restore();
    } else {
      console.log('Upload topper not drawn - image not loaded');
    }
  }
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
      // Always stack vertically for 2-cut photos
      const photoWidth = basePhotoSize * aspectRatio;
      const photoHeight = basePhotoSize;
      return {
        width: photoWidth + 40,
        height: (photoHeight * 2) + 50 + textAreaHeight
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
  textStyle: TextStyle,
  canvasWidth: number,
  canvasHeight: number,
  frameType: FrameType
): void {
  // Position text at the bottom
  const textY = canvasHeight - 40;
  const textX = canvasWidth / 2;

  // Set text style
  let fontString = '';
  if (textStyle.bold) fontString += 'bold ';
  if (textStyle.italic) fontString += 'italic ';
  fontString += '24px ';
  fontString += textStyle.fontFamily || 'Arial';

  ctx.font = fontString;
  ctx.fillStyle = textStyle.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add text shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Draw text
  ctx.fillText(text, textX, textY);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export async function downloadImage(imageData: string, filename: string): Promise<void> {
  const link = document.createElement('a');
  link.download = filename;
  link.href = imageData;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function copyImageToClipboard(imageData: string): Promise<void> {
  try {
    // Convert data URL to blob
    const response = await fetch(imageData);
    const blob = await response.blob();

    // Use Clipboard API to copy image
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);
  } catch (error) {
    console.error('Failed to copy image to clipboard:', error);
    throw new Error('클립보드 복사에 실패했습니다.');
  }
}