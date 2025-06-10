import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Copy, RotateCcw, Bold, Italic, Check } from "lucide-react";
import { FrameType, TopperData } from "@/pages/home";
import { generateFinalImage, downloadImage, copyImageToClipboard } from "@/lib/photo-utils";
import { useToast } from "@/hooks/use-toast";

interface TextDownloadProps {
  frameType: FrameType;
  topperData: TopperData;
  photos: string[];
  finalText: string;
  onTextChange: (text: string) => void;
  onStartOver: () => void;
}

export default function TextDownload({ 
  frameType, 
  topperData, 
  photos, 
  finalText, 
  onTextChange, 
  onStartOver 
}: TextDownloadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [finalImageData, setFinalImageData] = useState<string | null>(null);
  const [textStyle, setTextStyle] = useState({
    bold: false,
    italic: false,
    color: '#FFFFFF',
    fontFamily: 'Noto Sans KR'
  });
  const [frameColor, setFrameColor] = useState('#FFFFFF');

  // 20 pastel colors for frame selection
  const pastelColors = [
    '#FFE4E1', '#FFF0F5', '#E6E6FA', '#F0F8FF', '#F0FFFF',
    '#F5FFFA', '#F0FFF0', '#FFFACD', '#FFF8DC', '#FFEFD5',
    '#FFE4E1', '#FFDAB9', '#EEE8AA', '#F0E68C', '#DDA0DD',
    '#D8BFD8', '#FFB6C1', '#FFC0CB', '#FFCCCB', '#F5DEB3'
  ];
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (canvasRef.current && photos.length > 0) {
      generateFinalImage(
        canvasRef.current,
        frameType,
        photos,
        finalText,
        textStyle
      ).then((imageData) => {
        setFinalImageData(imageData);
      });
    }
  }, [frameType, photos, finalText, textStyle]);

  const handleDownload = async () => {
    if (finalImageData) {
      try {
        await downloadImage(finalImageData, `포토퍼스_${frameType}_${Date.now()}.png`);
        showSuccessMessage();
      } catch (error) {
        toast({
          title: "다운로드 실패",
          description: "이미지 다운로드에 실패했어요. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyToClipboard = async () => {
    if (finalImageData) {
      try {
        await copyImageToClipboard(finalImageData);
        showSuccessMessage();
      } catch (error) {
        toast({
          title: "복사 실패",
          description: "클립보드 복사에 실패했어요. 다시 시도해주세요.",
          variant: "destructive",
        });
      }
    }
  };

  const showSuccessMessage = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const toggleBold = () => {
    setTextStyle(prev => ({ ...prev, bold: !prev.bold }));
  };

  const toggleItalic = () => {
    setTextStyle(prev => ({ ...prev, italic: !prev.italic }));
  };

  const handleColorChange = (color: string) => {
    setTextStyle(prev => ({ ...prev, color }));
  };

  const handleFontChange = (fontFamily: string) => {
    setTextStyle(prev => ({ ...prev, fontFamily }));
  };

  const colorOptions = [
    { label: "흰색", value: "#FFFFFF" },
    { label: "검정색", value: "#000000" },
    { label: "빨간색", value: "#FF0000" },
    { label: "파란색", value: "#0000FF" },
    { label: "분홍색", value: "#FF69B4" },
    { label: "초록색", value: "#00FF00" },
  ];

  const fontOptions = [
    { label: "Noto Sans KR", value: "Noto Sans KR" },
    { label: "Do Hyeon", value: "Do Hyeon" },
    { label: "Jua", value: "Jua" },
    { label: "Nanum Gothic", value: "Nanum Gothic" },
    { label: "Black Han Sans", value: "Black Han Sans" },
    { label: "Cute Font", value: "Cute Font" },
    { label: "Gamja Flower", value: "Gamja Flower" },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-playful text-3xl font-bold text-gray-800 mb-4">
          🎉 마무리 작업
        </h2>
        <p className="text-gray-600 text-lg">텍스트를 추가하고 사진을 저장해보세요!</p>
      </div>

      <Card className="card-shadow mb-8">
        <CardContent className="p-8">
          {/* 최종 사진 미리보기 */}
          <div className="mb-8">
            <h3 className="font-playful text-2xl font-bold text-gray-800 mb-4 text-center">
              완성된 사진
            </h3>
            <div className="max-w-md mx-auto">
              <canvas
                ref={canvasRef}
                className="w-full rounded-2xl shadow-lg"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              
              {/* 텍스트 입력 */}
              <div className="mt-4">
                <Input
                  type="text"
                  placeholder="원하는 텍스트를 입력하세요"
                  value={finalText}
                  onChange={(e) => onTextChange(e.target.value)}
                  className="text-center font-medium text-lg p-4 rounded-xl border-2 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 텍스트 스타일 옵션 */}
          <div className="mb-8">
            <h4 className="font-bold text-lg text-gray-800 mb-4 text-center">텍스트 스타일</h4>
            <div className="flex justify-center items-center space-x-4 flex-wrap gap-2">
              <Button
                onClick={toggleBold}
                variant={textStyle.bold ? "default" : "outline"}
                className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                  textStyle.bold ? 'bg-primary text-white' : ''
                }`}
              >
                <Bold className="mr-2 w-4 h-4" />
                굵게
              </Button>
              
              <Button
                onClick={toggleItalic}
                variant={textStyle.italic ? "default" : "outline"}
                className={`px-4 py-2 rounded-xl transition-all duration-300 ${
                  textStyle.italic ? 'bg-primary text-white' : ''
                }`}
              >
                <Italic className="mr-2 w-4 h-4" />
                기울임
              </Button>
              
              <Select value={textStyle.color} onValueChange={handleColorChange}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue placeholder="색상" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: option.value }}
                        />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={textStyle.fontFamily} onValueChange={handleFontChange}>
                <SelectTrigger className="w-40 rounded-xl">
                  <SelectValue placeholder="폰트" />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span style={{ fontFamily: option.value }}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 다운로드 버튼들 */}
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Button 
              onClick={handleDownload}
              className="button-primary text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center"
              disabled={!finalImageData}
            >
              <Download className="mr-3 w-5 h-5" />
              PNG로 다운로드
            </Button>
            
            <Button 
              onClick={handleCopyToClipboard}
              className="button-secondary text-white px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center"
              disabled={!finalImageData}
            >
              <Copy className="mr-3 w-5 h-5" />
              클립보드에 복사
            </Button>
          </div>

          {/* 성공 메시지 */}
          {showSuccess && (
            <div className="mt-6 p-4 bg-success/20 border border-success rounded-2xl text-center">
              <Check className="text-success w-6 h-6 inline-block mr-2" />
              <span className="text-success font-bold">사진이 성공적으로 저장되었어요!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 다시 시작하기 버튼 */}
      <div className="text-center">
        <Button 
          onClick={onStartOver}
          variant="outline"
          className="px-8 py-3 rounded-2xl font-bold text-lg"
        >
          <RotateCcw className="mr-3 w-5 h-5" />
          다시 시작하기
        </Button>
      </div>
    </div>
  );
}
