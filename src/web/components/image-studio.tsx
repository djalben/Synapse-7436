import { useState } from "react";
import {
  Camera,
  Sparkles,
  Box,
  Zap,
  Download,
  Maximize2,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import { useUsage } from "./usage-context";

// Style option interface
interface StyleOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const styleOptions: StyleOption[] = [
  { id: "photorealistic", label: "Photorealistic", icon: Camera, description: "Ultra-realistic photography" },
  { id: "anime", label: "Anime/Manga", icon: Sparkles, description: "Japanese art style" },
  { id: "3d", label: "3D Render", icon: Box, description: "CGI quality renders" },
  { id: "cyberpunk", label: "Cyberpunk", icon: Zap, description: "Neon-lit futurism" },
];

// Aspect ratio interface
interface AspectRatio {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const aspectRatios: AspectRatio[] = [
  { id: "1:1", label: "Square", icon: Square },
  { id: "16:9", label: "Landscape", icon: RectangleHorizontal },
  { id: "9:16", label: "Portrait", icon: RectangleVertical },
];

// Generated image interface
interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  style: string;
  createdAt: string;
}

// Style selector component
interface StyleSelectorProps {
  selected: string;
  onChange: (value: string) => void;
}

const StyleSelector = ({ selected, onChange }: StyleSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {styleOptions.map((style) => {
        const Icon = style.icon;
        const isSelected = selected === style.id;

        return (
          <button
            key={style.id}
            onClick={() => onChange(style.id)}
            className={`
              relative p-4 rounded-xl text-left
              transition-all duration-300
              group
              ${isSelected
                ? "bg-gradient-to-br from-indigo-500/20 via-blue-500/15 to-purple-500/10 border border-indigo-500/40"
                : "bg-white/[0.02] border border-[#333] hover:border-[#444] hover:bg-white/[0.04]"
              }
            `}
          >
            {/* Glow effect for selected */}
            {isSelected && (
              <div className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-xl opacity-60" />
            )}

            <div className="relative">
              <div
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center mb-3
                  transition-all duration-300
                  ${isSelected
                    ? "bg-gradient-to-br from-indigo-500/30 to-blue-500/30"
                    : "bg-white/[0.05] group-hover:bg-white/[0.08]"
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isSelected ? "text-indigo-400" : "text-[#666] group-hover:text-[#888]"
                  }`}
                />
              </div>
              <p
                className={`text-sm font-medium transition-colors ${
                  isSelected ? "text-white" : "text-white/80"
                }`}
              >
                {style.label}
              </p>
              <p className="text-xs text-[#555] mt-0.5">{style.description}</p>
            </div>

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// Aspect ratio selector
interface AspectRatioSelectorProps {
  selected: string;
  onChange: (value: string) => void;
}

const AspectRatioSelector = ({ selected, onChange }: AspectRatioSelectorProps) => {
  return (
    <div className="flex gap-2">
      {aspectRatios.map((ratio) => {
        const Icon = ratio.icon;
        const isSelected = selected === ratio.id;

        return (
          <button
            key={ratio.id}
            onClick={() => onChange(ratio.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              transition-all duration-300
              ${isSelected
                ? "bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/40"
                : "bg-white/[0.02] border border-[#333] hover:border-[#444]"
              }
            `}
          >
            <Icon
              className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-[#666]"}`}
            />
            <span
              className={`text-sm font-medium ${
                isSelected ? "text-white" : "text-[#888]"
              }`}
            >
              {ratio.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Image count slider
interface ImageCountSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const ImageCountSlider = ({ value, onChange }: ImageCountSliderProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#666]">1</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-mono font-semibold text-white">{value}</span>
          <span className="text-sm text-[#666]">images</span>
        </div>
        <span className="text-xs text-[#666]">4</span>
      </div>
      <input
        type="range"
        min="1"
        max="4"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full h-1.5 bg-[#222] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-gradient-to-r
          [&::-webkit-slider-thumb]:from-indigo-500
          [&::-webkit-slider-thumb]:to-blue-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-indigo-500/40
          [&::-webkit-slider-thumb]:transition-shadow
          [&::-webkit-slider-thumb]:hover:shadow-indigo-500/60
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-gradient-to-r
          [&::-moz-range-thumb]:from-indigo-500
          [&::-moz-range-thumb]:to-blue-500
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
        "
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - 1) / 3) * 100}%, #222 ${((value - 1) / 3) * 100}%, #222 100%)`,
        }}
      />
    </div>
  );
};

// Lightbox modal component
interface LightboxProps {
  image: GeneratedImage | null;
  onClose: () => void;
}

const Lightbox = ({ image, onClose }: LightboxProps) => {
  if (!image) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synapse-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      
      {/* Content */}
      <div
        className="relative z-10 max-w-[90vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute -top-12 right-0 p-2 rounded-lg
            bg-white/10 backdrop-blur-md border border-white/20
            text-white/80 hover:text-white hover:bg-white/20
            transition-all duration-200
          "
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image */}
        <div className="relative rounded-xl overflow-hidden border border-[#333]">
          <img
            src={image.url}
            alt={image.prompt}
            className="max-w-full max-h-[75vh] object-contain"
          />
        </div>

        {/* Info panel */}
        <div className="mt-4 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-[#333]">
          <p className="text-sm text-white/80 line-clamp-2">{image.prompt}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs text-[#666]">Style: <span className="text-white/60 capitalize">{image.style}</span></span>
            <span className="text-xs text-[#666]">Ratio: <span className="text-white/60">{image.aspectRatio}</span></span>
            <button
              onClick={handleDownload}
              className="
                ml-auto flex items-center gap-2 px-4 py-2 rounded-lg
                bg-gradient-to-r from-indigo-600 to-blue-600
                text-white text-sm font-medium
                hover:shadow-lg hover:shadow-indigo-500/30
                transition-all duration-200
              "
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Image card component
interface ImageCardProps {
  image: GeneratedImage;
  onImageClick: (image: GeneratedImage) => void;
}

const ImageCard = ({ image, onImageClick }: ImageCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synapse-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Calculate height based on aspect ratio
  const getHeightClass = () => {
    switch (image.aspectRatio) {
      case "9:16": return "h-80";
      case "16:9": return "h-44";
      default: return "h-64";
    }
  };

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        ${getHeightClass()}
        border border-[#222] hover:border-[#444]
        group cursor-pointer
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10
        mb-4
      `}
      onClick={() => onImageClick(image)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Skeleton loader */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] animate-pulse flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500/50 animate-spin" />
        </div>
      )}

      {/* Image */}
      <img
        src={image.url}
        alt={image.prompt}
        className={`
          w-full h-full object-cover
          transition-all duration-500
          ${isLoaded ? "opacity-100" : "opacity-0"}
          ${isHovered ? "scale-105" : "scale-100"}
        `}
        onLoad={() => setIsLoaded(true)}
      />

      {/* Hover overlay */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-t from-black/80 via-black/40 to-transparent
          transition-opacity duration-300
          ${isHovered ? "opacity-100" : "opacity-0"}
        `}
      >
        {/* Action buttons */}
        <div
          className={`
            absolute bottom-4 left-4 right-4
            flex gap-2
            transition-all duration-300
            ${isHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}
          `}
        >
          <button
            onClick={handleDownload}
            className="
              flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              bg-white/10 backdrop-blur-md border border-white/20
              text-white text-sm font-medium
              hover:bg-white/20 transition-colors
            "
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(image);
            }}
            className="
              px-3 py-2.5 rounded-lg
              bg-white/10 backdrop-blur-md border border-white/20
              text-white
              hover:bg-white/20 transition-colors
            "
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle gradient overlay at top for depth */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
};

// Main Image Studio component
export const ImageStudio = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("photorealistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageCount, setImageCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  const { checkImageLimit, incrementImages, canGenerateImage, imageCount: usedImages, limits, setShowPaywall, setPaywallReason } = useUsage();
  const atLimit = !canGenerateImage;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    // Check usage limit before generating
    if (!checkImageLimit()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          numImages: imageCount,
          style: selectedStyle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate images");
      }

      // Add new images to the top of the gallery
      setGeneratedImages((prev) => [...data.images, ...prev]);
      
      // Increment usage count after successful generation
      incrementImages();
      
      // Clear prompt after successful generation
      setPrompt("");
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate images");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* Left Panel - Controls */}
      <div className="w-[35%] min-w-[360px] border-r border-[#222] p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="font-mono text-2xl font-semibold text-white mb-1">
              Image Studio
            </h2>
            <p className="text-sm text-[#666]">
              Generate stunning images from text descriptions
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Prompt Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">Prompt</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your image in detail..."
                rows={4}
                disabled={isGenerating}
                className="
                  w-full p-4 rounded-xl
                  bg-[#0a0a0a]/80 backdrop-blur-xl
                  border border-[#333] focus:border-indigo-500/50
                  text-white placeholder-[#555]
                  text-[15px] leading-relaxed
                  resize-none outline-none
                  transition-all duration-300
                  disabled:opacity-50
                "
              />
              <div className="absolute bottom-3 right-3 text-xs text-[#555]">
                {prompt.length}/500
              </div>
            </div>
          </div>

          {/* Style Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#888]">Style</label>
            <StyleSelector selected={selectedStyle} onChange={setSelectedStyle} />
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#888]">Aspect Ratio</label>
            <AspectRatioSelector selected={aspectRatio} onChange={setAspectRatio} />
          </div>

          {/* Number of Images */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#888]">Number of Images</label>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[#333]">
              <ImageCountSlider value={imageCount} onChange={setImageCount} />
            </div>
          </div>

          {/* Limit warning */}
          {atLimit && (
            <button
              onClick={() => {
                setPaywallReason("images")
                setShowPaywall(true)
              }}
              className="
                w-full p-4 rounded-xl
                bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10
                border border-red-500/30
                flex items-center justify-center gap-3
                group transition-all duration-300
                hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10
              "
            >
              <Lock className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm">
                Free image generations exhausted
              </span>
              <span className="text-amber-400/60 text-xs ml-1 group-hover:text-amber-400 transition-colors">
                Upgrade →
              </span>
            </button>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating || atLimit}
            className={`
              w-full py-4 rounded-xl
              font-medium text-base
              transition-all duration-300
              relative overflow-hidden
              group
              ${prompt.trim() && !isGenerating && !atLimit
                ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                : "bg-[#222] text-[#555] cursor-not-allowed"
              }
            `}
          >
            {/* Shimmer effect */}
            {prompt.trim() && !isGenerating && !atLimit && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
            
            <div className="relative flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : atLimit ? (
                <>
                  <Lock className="w-5 h-5 text-[#555]" />
                  <span>Upgrade to Generate</span>
                </>
              ) : (
                <>
                  <Sparkles className={`w-5 h-5 ${prompt.trim() ? "text-white/90" : "text-[#555]"}`} />
                  <span>Generate Images</span>
                </>
              )}
            </div>
          </button>

          {/* Credits indicator */}
          <div 
            className={`
              flex items-center justify-center gap-2 py-3 px-4 rounded-lg border
              ${atLimit 
                ? "bg-red-500/5 border-red-500/20" 
                : "bg-white/[0.02] border-[#222]"
              }
            `}
          >
            <div className={`w-2 h-2 rounded-full ${atLimit ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
            <span className="text-xs text-[#666]">
              <span className={`font-medium ${atLimit ? "text-red-400" : "text-white/80"}`}>
                {usedImages}/{limits.maxImages}
              </span> free generations used
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Gallery Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-mono text-lg font-semibold text-white">Gallery</h3>
            <p className="text-sm text-[#666]">
              {generatedImages.length} {generatedImages.length === 1 ? "image" : "images"} generated
            </p>
          </div>
        </div>

        {/* Empty state */}
        {generatedImages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-[#333] flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-[#444]" />
            </div>
            <h3 className="text-lg font-medium text-white/80 mb-2">No images yet</h3>
            <p className="text-sm text-[#666] max-w-xs">
              Enter a prompt and click "Generate Images" to create your first masterpiece
            </p>
          </div>
        )}

        {/* Masonry Grid */}
        {generatedImages.length > 0 && (
          <div className="columns-2 lg:columns-3 gap-4">
            {generatedImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onImageClick={setSelectedImage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Lightbox
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
};
