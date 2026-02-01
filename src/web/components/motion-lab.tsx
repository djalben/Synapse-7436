import { useState, useRef } from "react";
import {
  Upload,
  Play,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";

// Settings section component
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({ title, children, defaultOpen = true }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#222] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <span className="text-sm font-medium text-white/90">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#666]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#666]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-4 border-t border-[#222]">
          {children}
        </div>
      )}
    </div>
  );
};

// Duration selector
interface DurationSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const DurationSelector = ({ value, onChange }: DurationSelectorProps) => {
  const options = [5, 10];

  return (
    <div className="flex gap-2">
      {options.map((duration) => (
        <button
          key={duration}
          onClick={() => onChange(duration)}
          className={`
            flex-1 px-4 py-2.5 rounded-lg text-sm font-medium
            transition-all duration-200
            ${value === duration
              ? "bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/40 text-white"
              : "bg-white/[0.03] border border-[#333] text-[#888] hover:text-white hover:border-[#444]"
            }
          `}
        >
          {duration}s
        </button>
      ))}
    </div>
  );
};

// Aspect ratio selector
interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const AspectRatioSelector = ({ value, onChange }: AspectRatioSelectorProps) => {
  const ratios = [
    { id: "16:9", label: "16:9", width: 32, height: 18 },
    { id: "9:16", label: "9:16", width: 18, height: 32 },
    { id: "1:1", label: "1:1", width: 24, height: 24 },
  ];

  return (
    <div className="flex gap-3">
      {ratios.map((ratio) => (
        <button
          key={ratio.id}
          onClick={() => onChange(ratio.id)}
          className={`
            flex-1 flex flex-col items-center gap-2 p-3 rounded-xl
            transition-all duration-200
            ${value === ratio.id
              ? "bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/40"
              : "bg-white/[0.03] border border-[#333] hover:border-[#444]"
            }
          `}
        >
          <div 
            className={`
              bg-white/20 rounded-sm
              ${value === ratio.id ? "bg-indigo-400/40" : ""}
            `}
            style={{ width: ratio.width, height: ratio.height }}
          />
          <span className={`text-xs font-medium ${value === ratio.id ? "text-white" : "text-[#888]"}`}>
            {ratio.label}
          </span>
        </button>
      ))}
    </div>
  );
};

// Motion scale slider
interface MotionScaleSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const MotionScaleSlider = ({ value, onChange }: MotionScaleSliderProps) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-[#666]">
        <span>Subtle</span>
        <span className="text-white font-medium">{value}</span>
        <span>Dynamic</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-[#222] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-gradient-to-r
          [&::-webkit-slider-thumb]:from-indigo-500
          [&::-webkit-slider-thumb]:to-blue-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-indigo-500/30
          [&::-webkit-slider-thumb]:transition-shadow
          [&::-webkit-slider-thumb]:hover:shadow-indigo-500/50
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-gradient-to-r
          [&::-moz-range-thumb]:from-indigo-500
          [&::-moz-range-thumb]:to-blue-500
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
        "
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(value - 1) / 9 * 100}%, #222 ${(value - 1) / 9 * 100}%, #222 100%)`
        }}
      />
    </div>
  );
};

// Thumbnail component for recent generations
interface ThumbnailProps {
  duration: string;
  index: number;
}

const Thumbnail = ({ duration, index }: ThumbnailProps) => {
  return (
    <div 
      className="
        relative aspect-video rounded-xl overflow-hidden
        bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]
        border border-[#222] hover:border-[#444]
        cursor-pointer group
        transition-all duration-300
      "
    >
      {/* Placeholder gradient - unique per thumbnail */}
      <div 
        className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity"
        style={{
          background: `linear-gradient(${135 + index * 45}deg, 
            rgba(99, 102, 241, 0.3) 0%, 
            rgba(59, 130, 246, 0.2) 50%, 
            rgba(139, 92, 246, 0.3) 100%)`
        }}
      />
      
      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
        </div>
      </div>

      {/* Duration badge */}
      <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm">
        <span className="text-xs font-medium text-white/90">{duration}</span>
      </div>
    </div>
  );
};

// Main Motion Lab component
export const MotionLab = () => {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [motionScale, setMotionScale] = useState(5);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    console.log("Generating video with:", { prompt, duration, aspectRatio, motionScale, uploadedImage });
  };

  // Dummy recent generations
  const recentGenerations = [
    { id: 1, duration: "0:05" },
    { id: 2, duration: "0:10" },
    { id: 3, duration: "0:05" },
    { id: 4, duration: "0:08" },
    { id: 5, duration: "0:10" },
    { id: 6, duration: "0:05" },
  ];

  return (
    <div className="flex h-full min-h-screen">
      {/* Left Panel - Controls */}
      <div className="w-[40%] border-r border-[#222] p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="font-mono text-2xl font-semibold text-white mb-1">
              Motion Lab
            </h2>
            <p className="text-sm text-[#666]">
              Generate videos from text or images
            </p>
          </div>

          {/* Prompt Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">Prompt</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your video..."
                rows={4}
                className="
                  w-full p-4 rounded-xl
                  bg-[#0a0a0a]/80 backdrop-blur-xl
                  border border-[#333] focus:border-indigo-500/50
                  text-white placeholder-[#555]
                  text-[15px] leading-relaxed
                  resize-none outline-none
                  transition-all duration-300
                "
              />
              <div className="absolute bottom-3 right-3 text-xs text-[#555]">
                {prompt.length}/1000
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">Reference Image</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative p-6 rounded-xl
                border-2 border-dashed
                cursor-pointer
                transition-all duration-300
                ${isDragging
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-[#333] hover:border-[#444] bg-white/[0.02] hover:bg-white/[0.04]"
                }
              `}
            >
              {uploadedImage ? (
                <div className="relative">
                  <img
                    src={uploadedImage}
                    alt="Uploaded reference"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedImage(null);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white/70 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#666]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/80">
                      Upload Reference Image
                    </p>
                    <p className="text-xs text-[#555] mt-1">
                      For Image-to-Video generation
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <CollapsibleSection title="Duration">
              <DurationSelector value={duration} onChange={setDuration} />
            </CollapsibleSection>

            <CollapsibleSection title="Aspect Ratio">
              <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
            </CollapsibleSection>

            <CollapsibleSection title="Motion Scale">
              <MotionScaleSlider value={motionScale} onChange={setMotionScale} />
            </CollapsibleSection>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className={`
              w-full py-4 rounded-xl
              font-medium text-base
              transition-all duration-300
              relative overflow-hidden
              group
              ${prompt.trim()
                ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                : "bg-[#222] text-[#555] cursor-not-allowed"
              }
            `}
          >
            {/* Animated glow effect */}
            {prompt.trim() && (
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-white/20 to-indigo-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Video
            </span>
          </button>
        </div>
      </div>

      {/* Right Panel - Preview & History */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-8">
          {/* Main Video Player */}
          <div>
            <h3 className="font-mono text-lg font-medium text-white mb-4">Preview</h3>
            <div 
              className="
                relative aspect-video rounded-2xl overflow-hidden
                bg-gradient-to-br from-[#0a0a0a] to-[#111]
                border border-[#222]
              "
            >
              {/* Placeholder content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                {/* Subtle pattern */}
                <div 
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(99, 102, 241, 0.5) 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                  }}
                />
                
                {/* Play button */}
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white/40 ml-1" />
                  </div>
                </div>
                
                <p className="text-[#555] text-sm">Your video will appear here</p>
              </div>

              {/* Corner decorations */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.05]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#444]" />
                <span className="text-xs text-[#666]">Ready</span>
              </div>
            </div>
          </div>

          {/* Recent Generations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#666]" />
                Recent Generations
              </h3>
              <button className="text-xs text-[#666] hover:text-white transition-colors">
                View All
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {recentGenerations.map((gen, index) => (
                <Thumbnail key={gen.id} duration={gen.duration} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
