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
} from "lucide-react";

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

// Dummy images for the gallery with varying heights for masonry effect
const dummyImages = [
  { id: 1, src: "https://images.unsplash.com/photo-1675426513824-77813c06de50?w=400&h=600&fit=crop", height: "h-72" },
  { id: 2, src: "https://images.unsplash.com/photo-1686191128892-3b37add4ad2e?w=400&h=300&fit=crop", height: "h-48" },
  { id: 3, src: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=500&fit=crop", height: "h-64" },
  { id: 4, src: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=400&fit=crop", height: "h-56" },
  { id: 5, src: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=550&fit=crop", height: "h-68" },
  { id: 6, src: "https://images.unsplash.com/photo-1696258686454-60082b2c33e2?w=400&h=350&fit=crop", height: "h-52" },
  { id: 7, src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop", height: "h-72" },
  { id: 8, src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=450&fit=crop", height: "h-60" },
  { id: 9, src: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=380&fit=crop", height: "h-52" },
  { id: 10, src: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=400&h=520&fit=crop", height: "h-64" },
];

// Image card component
interface ImageCardProps {
  image: typeof dummyImages[0];
}

const ImageCard = ({ image }: ImageCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        ${image.height}
        border border-[#222] hover:border-[#444]
        group cursor-pointer
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10
        mb-4
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Skeleton loader */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] animate-pulse" />
      )}

      {/* Image */}
      <img
        src={image.src}
        alt={`Generated image ${image.id}`}
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
  const [imageCount, setImageCount] = useState(2);

  const handleGenerate = () => {
    console.log("Generating images with:", {
      prompt,
      style: selectedStyle,
      aspectRatio,
      count: imageCount,
    });
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

          {/* Prompt Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">Prompt</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your image in detail..."
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
            {/* Shimmer effect */}
            {prompt.trim() && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
            
            <div className="relative flex items-center justify-center gap-2">
              <Sparkles className={`w-5 h-5 ${prompt.trim() ? "text-white/90" : "text-[#555]"}`} />
              <span>Generate Images</span>
            </div>
          </button>

          {/* Credits indicator */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-white/[0.02] border border-[#222]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-[#666]">
              <span className="text-white/80 font-medium">47</span> credits remaining
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
            <p className="text-sm text-[#666]">{dummyImages.length} images generated</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-white/[0.05] border border-[#333] text-sm text-[#888] hover:text-white hover:border-[#444] transition-colors">
              All
            </button>
            <button className="px-4 py-2 rounded-lg text-sm text-[#666] hover:text-white transition-colors">
              Favorites
            </button>
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="columns-2 lg:columns-3 gap-4">
          {dummyImages.map((image) => (
            <ImageCard key={image.id} image={image} />
          ))}
        </div>
      </div>
    </div>
  );
};
