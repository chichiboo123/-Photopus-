import React, { useState } from "react";
import { Camera } from "lucide-react";
import StepIndicator from "@/components/step-indicator";
import FrameSelection from "@/components/frame-selection";
import TopperDesign from "@/components/topper-design";
import PhotoCapture from "@/components/photo-capture";
import TextDownload from "@/components/text-download";
import { Button } from "@/components/ui/button";

export type FrameType = "1cut" | "2cut" | "4cut";
export type TopperData = {
  type: "emoji" | "upload";
  data: string;
};

export interface PhotoData {
  frameType: FrameType;
  topperData: TopperData;
  photos: string[];
  finalText?: string;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFrame, setSelectedFrame] = useState<FrameType | null>(null);
  const [selectedTopper, setSelectedTopper] = useState<TopperData | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [finalText, setFinalText] = useState("");

  const resetApp = () => {
    setCurrentStep(1);
    setSelectedFrame(null);
    setSelectedTopper(null);
    setCapturedPhotos([]);
    setFinalText("");
  };

  const handleFrameSelect = (frame: FrameType) => {
    setSelectedFrame(frame);
    setCurrentStep(2);
  };

  const handleTopperSelect = (topper: TopperData) => {
    setSelectedTopper(topper);
  };

  const handleNextToCamera = () => {
    if (selectedTopper) {
      setCurrentStep(3);
    }
  };

  const handlePhotosCaptured = (photos: string[]) => {
    setCapturedPhotos(photos);
    setCurrentStep(4);
  };

  const handleTextChange = (text: string) => {
    setFinalText(text);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="text-center py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-b-3xl"></div>
        <div className="relative">
          <h1 className="font-playful text-4xl md:text-6xl font-bold text-primary mb-2 animate-bounce-gentle">
            <img src="/octopus-logo.png" alt="포토퍼스 로고" className="inline-block mr-3 w-12 h-12 md:w-16 md:h-16" />
            포토퍼스
          </h1>
          <p className="text-gray-600 text-lg font-medium">재미있는 AR 토퍼와 함께 사진을 찍어보세요!</p>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Step Content */}
        {currentStep === 1 && (
          <FrameSelection onFrameSelect={handleFrameSelect} />
        )}
        
        {currentStep === 2 && selectedFrame && (
          <TopperDesign 
            onTopperSelect={handleTopperSelect}
            selectedTopper={selectedTopper}
            onNext={handleNextToCamera}
          />
        )}
        
        {currentStep === 3 && selectedFrame && selectedTopper && (
          <PhotoCapture 
            frameType={selectedFrame}
            topperData={selectedTopper}
            onPhotosCaptured={handlePhotosCaptured}
          />
        )}
        
        {currentStep === 4 && selectedFrame && selectedTopper && capturedPhotos.length > 0 && (
          <TextDownload 
            frameType={selectedFrame}
            topperData={selectedTopper}
            photos={capturedPhotos}
            finalText={finalText}
            onTextChange={handleTextChange}
            onStartOver={resetApp}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
        <Button 
          onClick={resetApp}
          className="bg-white shadow-xl text-gray-700 hover:bg-gray-50 font-bold px-6 py-3 rounded-full"
          variant="outline"
        >
          🏠 처음으로
        </Button>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm py-4 text-center z-10">
        <p className="font-footer text-gray-500 text-sm">
          created by.{" "}
          <a 
            href="https://litt.ly/chichiboo" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 font-medium transition-colors duration-300"
          >
            교육뮤지컬 꿈꾸는 치수쌤
          </a>
        </p>
      </footer>
    </div>
  );
}
