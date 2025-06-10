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
  topperData: TopperData;
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
  const [uploadedImageCache, setUploadedImageCache] = useState<HTMLImageElement | null>(null);

  // Cache uploaded image when topper data changes
  useEffect(() => {
    if (topperData.type === 'upload') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setUploadedImageCache(img);
      };
      img.src = topperData.data;
    } else {
      setUploadedImageCache(null);
    }
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

    // Draw AR topper with improved face tracking
    if (landmarks && landmarks.landmarks.length > 0) {
      const faceBox = landmarks.boundingBox;
      const faceWidth = faceBox.width * canvas.width;
      const faceHeight = faceBox.height * canvas.height;
      
      // Position topper at the top center of the face, slightly above
      const topperX = (faceBox.xMin + faceBox.width / 2) * canvas.width;
      const topperY = faceBox.yMin * canvas.height - faceHeight * 0.15;
      
      // Calculate topper size based on face width
      const topperSize = Math.max(faceWidth * 0.5, 40);
      
      // Clamp position to stay within canvas bounds
      const safeX = Math.max(topperSize / 2, Math.min(topperX, canvas.width - topperSize / 2));
      const safeY = Math.max(topperSize / 2, Math.min(topperY, canvas.height - topperSize / 2));

      ctx.save();
      ctx.translate(safeX, safeY);

      if (topperData.type === 'emoji') {
        ctx.font = `${topperSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(topperData.data, 0, 0);
      } else if (topperData.type === 'upload' && uploadedImageCache) {
        ctx.drawImage(
          uploadedImageCache,
          -topperSize / 2,
          -topperSize / 2,
          topperSize,
          topperSize
        );
      }

      ctx.restore();
    }
  }, [landmarks, topperData, showTopper, uploadedImageCache]);

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
              className="p-4 rounded-2xl"
              title="토퍼 숨기기/보이기"
            >
              {showTopper ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
            </Button>
          </div>

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
