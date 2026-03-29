import { useState } from "react";

const MOODS = [
  "relaxing ambient",
  "upbeat pop",
  "inspiring orchestral",
  "corporate background",
  "lo-fi chill",
  "dramatic cinematic",
];

export default function PodcastStudio() {
  const [activeTab, setActiveTab] = useState("narrate");

  // Narration state
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState("default");
  const [narrationPath, setNarrationPath] = useState(null);
  const [narrationLoading, setNarrationLoading] = useState(false);

  // Music state
  const [mood, setMood] = useState("relaxing ambient");
  const [musicDuration, setMusicDuration] = useState(30);
  const [musicPath, setMusicPath] = useState(null);
  const [musicLoading, setMusicLoading] = useState(false);

  // Mix state
  const [mixPath, setMixPath] = useState(null);
  const [mixLoading, setMixLoading] = useState(false);
  const [musicVolumeDb, setMusicVolumeDb] = useState(-20);

  const [error, setError] = useState(null);

  async function handleNarrate(e) {
    e.preventDefault();
    if (!script.trim()) return;
    setNarrationLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/podcast/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, voice }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Narration failed");
      const data = await res.json();
      setNarrationPath(data.file_path);
    } catch (err) {
      setError(err.message);
    } finally {
      setNarrationLoading(false);
    }
  }

  async function handleGenerateMusic(e) {
    e.preventDefault();
    setMusicLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/podcast/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, duration: musicDuration }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Music generation failed");
      const data = await res.json();
      setMusicPath(data.file_path);
    } catch (err) {
      setError(err.message);
    } finally {
      setMusicLoading(false);
    }
  }

  async function handleMix(e) {
    e.preventDefault();
    if (!narrationPath || !musicPath) return;
    setMixLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/podcast/mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          narration_path: narrationPath,
          music_path: musicPath,
          music_volume_db: musicVolumeDb,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Mixing failed");
      const data = await res.json();
      setMixPath(data.file_path);
    } catch (err) {
      setError(err.message);
    } finally {
      setMixLoading(false);
    }
  }

  function getAudioSrc(filePath) {
    if (!filePath) return null;
    return `/media/audio/${filePath.split("/").pop()}`;
  }

  return (
    <div className="podcast-studio">
      <h2>Podcast Studio</h2>
      <p className="subtitle">Powered by Coqui TTS &amp; Meta MusicGen (open-source)</p>

      <div className="studio-tabs">
        {["narrate", "music", "mix"].map((tab) => (
          <button
            key={tab}
            className={`studio-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === "narrate" && (
        <form onSubmit={handleNarrate} className="generator-form">
          <label>
            Script / Narration Text
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter your podcast script..."
              rows={6}
              required
            />
          </label>
          <label>
            Voice Model
            <input
              type="text"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              placeholder="default"
            />
          </label>
          <button type="submit" disabled={narrationLoading || !script.trim()}>
            {narrationLoading ? "Generating narration…" : "Generate Narration"}
          </button>
          {narrationPath && (
            <div className="audio-result">
              <p>✅ Narration ready</p>
              <audio controls src={getAudioSrc(narrationPath)} />
            </div>
          )}
        </form>
      )}

      {activeTab === "music" && (
        <form onSubmit={handleGenerateMusic} className="generator-form">
          <label>
            Music Mood / Style
            <select value={mood} onChange={(e) => setMood(e.target.value)}>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            Duration: {musicDuration}s
            <input
              type="range"
              min={10}
              max={120}
              value={musicDuration}
              onChange={(e) => setMusicDuration(Number(e.target.value))}
            />
          </label>
          <button type="submit" disabled={musicLoading}>
            {musicLoading ? "Generating music…" : "Generate Background Music"}
          </button>
          {musicPath && (
            <div className="audio-result">
              <p>✅ Music ready</p>
              <audio controls src={getAudioSrc(musicPath)} />
            </div>
          )}
        </form>
      )}

      {activeTab === "mix" && (
        <form onSubmit={handleMix} className="generator-form">
          <div className="mix-status">
            <p>Narration: {narrationPath ? "✅ Ready" : "❌ Generate narration first"}</p>
            <p>Music: {musicPath ? "✅ Ready" : "❌ Generate music first"}</p>
          </div>
          <label>
            Music Volume (dB): {musicVolumeDb}
            <input
              type="range"
              min={-40}
              max={0}
              value={musicVolumeDb}
              onChange={(e) => setMusicVolumeDb(Number(e.target.value))}
            />
          </label>
          <button
            type="submit"
            disabled={mixLoading || !narrationPath || !musicPath}
          >
            {mixLoading ? "Mixing…" : "Mix Podcast Episode"}
          </button>
          {mixPath && (
            <div className="audio-result">
              <p>✅ Podcast episode ready</p>
              <audio controls src={getAudioSrc(mixPath)} />
              <a href={getAudioSrc(mixPath)} download className="download-btn">
                Download MP3
              </a>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
