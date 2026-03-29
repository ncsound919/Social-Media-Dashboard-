import { lazy, Suspense, useState, useEffect, useRef } from "react";
import ContentCalendar from "./ContentCalendar";

const ContentTextGenerator = lazy(() => import("./ContentTextGenerator"));
const ImageGenerator = lazy(() => import("./ImageGenerator"));
const VideoGenerator = lazy(() => import("./VideoGenerator"));
const PodcastStudio = lazy(() => import("./PodcastStudio"));
const VoiceBox = lazy(() => import("./VoiceBox"));

const TABS = [
  { id: "text", label: "✍️ Text" },
  { id: "image", label: "🖼 Image" },
  { id: "video", label: "🎬 Video" },
  { id: "podcast", label: "🎙 Podcast" },
  { id: "voicebox", label: "🗣 VoiceBox" },
  { id: "calendar", label: "📅 Calendar" },
];

function LoadingFallback() {
  return (
    <div className="loading-fallback">
      <div className="spinner" />
      <p>Loading module…</p>
    </div>
  );
}

export default function ContentCreationStudio() {
  const [activeTab, setActiveTab] = useState("text");
  const [generatedTextItems, setGeneratedTextItems] = useState([]);
  const [cpuMode, setCpuMode] = useState(false);
  const tabRefs = useRef({});

  useEffect(() => {
    fetch("/api/ai/config")
      .then((r) => r.json())
      .then((d) => setCpuMode(d.cpu_mode === true))
      .catch(() => {});
  }, []);

  function handleTextGenerated(item) {
    setGeneratedTextItems((prev) => [item, ...prev].slice(0, 10));
  }

  // Keyboard navigation for the tab list (arrow keys, Home, End).
  function handleTabKeyDown(e, tabId) {
    const ids = TABS.map((t) => t.id);
    const idx = ids.indexOf(tabId);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % ids.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + ids.length) % ids.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ids.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(ids[next]);
    tabRefs.current[ids[next]]?.focus();
  }

  return (
    <div className="content-creation-studio">
      <header className="studio-header">
        <h1>🚀 AI Content Creation Studio</h1>
        <p className="studio-subtitle">
          Generate text, images, videos, podcasts, and more — all powered by open-source AI.
        </p>
      </header>

      {cpuMode && (
        <div className="cpu-mode-banner" role="status">
          🖥 Running in <strong>CPU mode</strong> — generation may take a few minutes per request.
          To enable GPU acceleration, see <code>docker-compose.gpu.yml</code>.
        </div>
      )}

      <nav className="studio-nav" role="tablist" aria-label="Content creation tools">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`studio-nav-tab ${activeTab === tab.id ? "active" : ""}`}
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="studio-content">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            id={`tabpanel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
          >
            <Suspense fallback={<LoadingFallback />}>
              {activeTab === tab.id && tab.id === "text" && (
                <ContentTextGenerator onGenerated={handleTextGenerated} cpuMode={cpuMode} />
              )}
              {activeTab === tab.id && tab.id === "image" && <ImageGenerator cpuMode={cpuMode} />}
              {activeTab === tab.id && tab.id === "video" && <VideoGenerator cpuMode={cpuMode} />}
              {activeTab === tab.id && tab.id === "podcast" && <PodcastStudio cpuMode={cpuMode} />}
              {activeTab === tab.id && tab.id === "voicebox" && <VoiceBox cpuMode={cpuMode} />}
              {activeTab === tab.id && tab.id === "calendar" && (
                <ContentCalendar generatedContent={generatedTextItems} />
              )}
            </Suspense>
          </div>
        ))}
      </main>
    </div>
  );
}
