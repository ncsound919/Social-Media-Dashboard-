import { lazy, Suspense, useState } from "react";
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

  function handleTextGenerated(item) {
    setGeneratedTextItems((prev) => [item, ...prev].slice(0, 10));
  }

  return (
    <div className="content-creation-studio">
      <header className="studio-header">
        <h1>🚀 AI Content Creation Studio</h1>
        <p className="studio-subtitle">
          Generate text, images, videos, podcasts, and more — all powered by open-source AI.
        </p>
      </header>

      <nav className="studio-nav" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`studio-nav-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="studio-content">
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === "text" && (
            <ContentTextGenerator onGenerated={handleTextGenerated} />
          )}
          {activeTab === "image" && <ImageGenerator />}
          {activeTab === "video" && <VideoGenerator />}
          {activeTab === "podcast" && <PodcastStudio />}
          {activeTab === "voicebox" && <VoiceBox />}
          {activeTab === "calendar" && (
            <ContentCalendar generatedContent={generatedTextItems} />
          )}
        </Suspense>
      </main>
    </div>
  );
}
