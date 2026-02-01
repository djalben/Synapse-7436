import { Clock, Settings as SettingsIcon, Sparkles } from "lucide-react";

// Placeholder content for tabs not yet implemented
interface PlaceholderPageProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const PlaceholderPage = ({ icon: Icon, title, description }: PlaceholderPageProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <Icon className="w-8 h-8 text-[#666]" />
          </div>
        </div>
        <h2 className="font-mono text-2xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-[#666] text-sm">{description}</p>
        <div className="mt-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-[#333]">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-[#888]">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HistoryPlaceholder = () => (
  <PlaceholderPage
    icon={Clock}
    title="History"
    description="View and manage your past generations, conversations, and creative projects."
  />
);

export const SettingsPlaceholder = () => (
  <PlaceholderPage
    icon={SettingsIcon}
    title="Settings"
    description="Customize your Synapse experience, manage API keys, and configure preferences."
  />
);
