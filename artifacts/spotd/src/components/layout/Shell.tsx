import { Link, useLocation } from "wouter";
import { DownloadCloud, History, Settings, Zap, Radio } from "lucide-react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ href, icon, label }: NavItemProps) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}

function HeartBeat() {
  return (
    <span
      className="inline-block"
      style={{
        animation: "heartbeat 1.2s ease-in-out infinite",
        display: "inline-block",
        fontSize: "inherit",
        lineHeight: 1,
      }}
    >
      ❤️
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.3); }
          28% { transform: scale(1); }
          42% { transform: scale(1.2); }
          70% { transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Top banner */}
      <div className="w-full bg-primary/5 border-b border-primary/20 py-1.5 px-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-1">
        <span>Made with love for listeners</span>
        <HeartBeat />
        <span>by Suyash Prabhu</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <Zap size={20} className="fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight">SpotD</span>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <NavItem href="/" icon={<DownloadCloud size={20} />} label="Downloader" />
            <NavItem href="/stream" icon={<Radio size={20} />} label="Spot D Stream" />
            <NavItem href="/history" icon={<History size={20} />} label="History" />
            <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" />
          </nav>

          <div className="p-6 text-sm text-muted-foreground border-t border-border">
            <p className="font-semibold text-foreground">SpotD</p>
            <p className="mt-1">by Suyash Prabhu</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background/50">
          {children}
        </main>
      </div>
    </div>
  );
}
