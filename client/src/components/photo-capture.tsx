import React, { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, RotateCw, Eye, EyeOff } from "lucide-react";
import { FrameType, TopperData } from "@/pages/home";
import { useCamera } from "@/hooks/use-camera";
import { useMediaPipe } from "@/hooks/use-mediapipe";
import { capturePhotoWithAR } from "@/lib/photo-utils";

interface PhotoCaptureProps {
  frameType: FrameType;
  topperData: TopperData[];
  onPhotosCaptured: (photos: string[]) => void;
}

export default function PhotoCapture({ frameType, topperData, onPhotosCaptured }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [showTopper, setShowTopper] = useState(true);
  const [topperCounts, setTopperCounts] = useState<{[key: string]: number}>({});
  const [topperSize, setTopperSize] = useState(1.0);

  const { stream, error: cameraError } = useCamera();
  const { landmarks, isReady: mediaPipeReady } = useMediaPipe(videoRef.current);

  const requiredPhotos = frameType === '4cut' ? 4 : frameType === '2cut' ? 2 : 1;

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (capturedPhotos.length >= requiredPhotos) {
      onPhotosCaptured(capturedPhotos);
    }
  }, [capturedPhotos, requiredPhotos, onPhotosCaptured]);

  // Store loaded images for better performance
  const [uploadedImageCaches, setUploadedImageCaches] = useState<Map<string, HTMLImageElement>>(new Map());

  // Cache uploaded images when topper data changes
  useEffect(() => {
    const newCaches = new Map<string, HTMLImageElement>();
    
    topperData.forEach(topper => {
      if (topper.type === 'upload') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setUploadedImageCaches(prev => {
            const updated = new Map(prev);
            updated.set(topper.id, img);
            return updated;
          });
        };
        img.src = topper.data;
      }
    });
  }, [topperData]);

  // Real-time AR overlay rendering
  const renderAROverlay = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !showTopper || !landmarks) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw multiple AR toppers with improved face tracking
    if (landmarks && landmarks.landmarks.length > 0 && topperData.length > 0) {
      const faceBox = landmarks.boundingBox;
      const faceWidth = faceBox.width * canvas.width;
      const faceHeight = faceBox.height * canvas.height;
      
      // Base position at the top center of the face
      const baseCenterX = (faceBox.xMin + faceBox.width / 2) * canvas.width;
      const baseCenterY = faceBox.yMin * canvas.height - faceHeight * 0.15;
      
      // Calculate topper size based on face width and size multiplier
      const baseTopperSize = Math.max(faceWidth * 0.4, 30);
      const adjustedTopperSize = baseTopperSize * topperSize;
      
      // Arrange multiple toppers with better spacing
      topperData.forEach((topper, index) => {
        const totalToppers = topperData.length;
        let topperX, topperY;
        
        if (totalToppers === 1) {
          topperX = baseCenterX;
          topperY = baseCenterY;
        } else {
          // Use wider angle spread for better separation
          const angle = (index - (totalToppers - 1) / 2) * (Math.PI / (totalToppers + 1));
          const radius = Math.max(adjustedTopperSize * 1.5, 80); // Increased radius for better spacing
          
          topperX = baseCenterX + Math.sin(angle) * radius;
          topperY = baseCenterY - Math.abs(Math.cos(angle)) * radius * 0.5;
        }
        
        // Clamp position to stay within canvas bounds
        const safeX = Math.max(adjustedTopperSize / 2, Math.min(topperX, canvas.width - adjustedTopperSize / 2));
        const safeY = Math.max(adjustedTopperSize / 2, Math.min(topperY, canvas.height - adjustedTopperSize / 2));

        ctx.save();
        ctx.translate(safeX, safeY);

        if (topper.type === 'emoji') {
          ctx.font = `${adjustedTopperSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(topper.data, 0, 0);
        } else if (topper.type === 'upload') {
          const cachedImg = uploadedImageCaches.get(topper.id);
          if (cachedImg) {
            ctx.drawImage(
              cachedImg,
              -adjustedTopperSize / 2,
              -adjustedTopperSize / 2,
              adjustedTopperSize,
              adjustedTopperSize
            );
          }
        }

        ctx.restore();
      });
    }
  }, [landmarks, topperData, showTopper, uploadedImageCaches]);

  // Start AR overlay animation loop
  useEffect(() => {
    let animationFrame: number;
    
    const animate = () => {
      renderAROverlay();
      animationFrame = requestAnimationFrame(animate);
    };

    if (stream && mediaPipeReady) {
      animate();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [stream, mediaPipeReady, renderAROverlay]);

  const startCountdown = () => {
    setIsCountingDown(true);
    setCountdownNumber(3);
    
    const timer = setInterval(() => {
      setCountdownNumber((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCountingDown(false);
          capturePhoto();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const photo = capturePhotoWithAR(
      videoRef.current,
      canvasRef.current,
      landmarks,
      topperData,
      showTopper,
      flipHorizontal,
      flipVertical
    );

    if (photo) {
      setCapturedPhotos(prev => [...prev, photo]);
    }
  };

  if (cameraError) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <Camera className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-bold">카메라 접근 오류</h3>
            <p className="mt-2">카메라에 접근할 수 없어요. 브라우저에서 카메라 권한을 허용해주세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-playful text-3xl font-bold text-gray-800 mb-4">
          📷 사진을 촬영해요
        </h2>
        <p className="text-gray-600 text-lg">카메라 앞에서 포즈를 취해보세요!</p>
        <p className="text-sm text-gray-500 mt-2">
          {capturedPhotos.length}/{requiredPhotos} 장 촬영 완료
        </p>
      </div>

      <Card className="card-shadow mb-8">
        <CardContent className="p-8">
          {/* 카메라 미리보기 영역 */}
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${flipHorizontal ? 'scale-x-[-1]' : ''} ${flipVertical ? 'scale-y-[-1]' : ''}`}
            />
            
            {/* AR 오버레이 캔버스 */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            />

            {/* MediaPipe 상태 표시 */}
            {!mediaPipeReady && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
                얼굴 인식 초기화 중...
              </div>
            )}

            {/* 카운트다운 오버레이 */}
            {isCountingDown && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-8xl font-bold animate-pulse-gentle">
                  {countdownNumber}
                </div>
              </div>
            )}
          </div>

          {/* 카메라 컨트롤 */}
          <div className="flex justify-center items-center space-x-6 mb-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setFlipHorizontal(!flipHorizontal)}
              className="p-4 rounded-2xl"
              title="좌우 반전"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => setFlipVertical(!flipVertical)}
              className="p-4 rounded-2xl"
              title="상하 반전"
            >
              <RotateCw className="w-6 h-6" />
            </Button>
            
            <Button
              onClick={startCountdown}
              className="button-primary text-white px-8 py-4 rounded-full font-bold text-lg transform hover:scale-105 transition-all duration-300"
              disabled={isCountingDown || !stream}
            >
              <Camera className="w-6 h-6 mr-3" />
              사진 촬영
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowTopper(!showTopper)}
              className={`p-4 rounded-2xl ${showTopper ? 'bg-primary text-white' : ''}`}
              title={showTopper ? "토퍼 숨기기" : "토퍼 보이기"}
            >
              {showTopper ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </Button>
          </div>

          {/* 토퍼 컨트롤 */}
          {topperData.length > 0 && (
            <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
              <h3 className="font-playful text-xl font-bold text-gray-800 mb-4 text-center">토퍼 설정</h3>
              
              {/* 토퍼 크기 조절 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  토퍼 크기: {Math.round(topperSize * 100)}%
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">작게</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={topperSize}
                    onChange={(e) => setTopperSize(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">크게</span>
                </div>
              </div>

              {/* 개별 토퍼 개수 조절 */}
              <div className="grid gap-4">
                <h4 className="font-medium text-gray-700">토퍼별 개수 설정</h4>
                {topperData.map((topper) => (
                  <div key={topper.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
                        {topper.type === 'emoji' ? (
                          <span className="text-lg">{topper.data}</span>
                        ) : (
                          <img src={topper.data} alt="Topper" className="w-full h-full object-cover rounded" />
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        {topper.type === 'emoji' ? topper.data : '업로드 이미지'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTopperCounts(prev => ({
                          ...prev,
                          [topper.id]: Math.max(1, (prev[topper.id] || 1) - 1)
                        }))}
                        className="w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">
                        {topperCounts[topper.id] || 1}
                      </span>
                      <button
                        onClick={() => setTopperCounts(prev => ({
                          ...prev,
                          [topper.id]: Math.min(10, (prev[topper.id] || 1) + 1)
                        }))}
                        className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 촬영된 사진 미리보기 */}
          {capturedPhotos.length > 0 && (
            <div>
              <h3 className="font-playful text-2xl font-bold text-gray-800 mb-4 text-center">
                촬영된 사진
              </h3>
              <div className={`grid gap-4 mb-6 ${
                frameType === '4cut' ? 'grid-cols-2 md:grid-cols-4' : 
                frameType === '2cut' ? 'grid-cols-1 md:grid-cols-2' : 
                'grid-cols-1'
              }`}>
                {capturedPhotos.map((photo, index) => (
                  <div key={index} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
                    <img 
                      src={photo} 
                      alt={`Captured photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              
              {capturedPhotos.length >= requiredPhotos && (
                <div className="text-center">
                  <Button 
                    onClick={() => onPhotosCaptured(capturedPhotos)}
                    className="button-secondary text-white px-12 py-4 rounded-2xl font-bold text-xl"
                  >
                    ✏️ 텍스트 추가하기
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
