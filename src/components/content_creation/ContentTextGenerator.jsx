import { useState } from "react";

const PLATFORMS = ["twitter", "instagram", "linkedin", "tiktok"];
const TONES = ["engaging", "professional", "humorous", "inspirational", "casual"];
const CONTENT_TYPES = ["caption", "hashtags", "post_copy", "blog_draft", "calendar_idea"];

export default function ContentTextGenerator({ onGenerated, cpuMode } = {}) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [tone, setTone] = useState("engaging");
  const [contentType, setContentType] = useState("caption");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone, content_type: contentType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }
      const data = await res.json();
      setResult(data);
      if (onGenerated) onGenerated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
    }
  }

  return (
    <div className="content-text-generator">
      <h2>AI Text &amp; Caption Generator</h2>
      <p className="subtitle">Powered by Qwen2.5 (open-source LLM)</p>

      <form onSubmit={handleGenerate} className="generator-form">
        <label>
          Topic / Subject
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Summer product launch, fitness tips..."
            required
          />
        </label>

        <label>
          Platform
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tone
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Content Type
          <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
            {CONTENT_TYPES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={loading || !topic.trim()}>
          {loading ? "Generating…" : (
            <>Generate Content{cpuMode && <span className="time-badge">~1–3 min on CPU</span>}</>
          )}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="result-card">
          <div className="result-header">
            <span className="badge">{result.platform}</span>
            <span className="badge">{result.tone}</span>
            <span className="badge">{result.content_type.replace(/_/g, " ")}</span>
          </div>
          <pre className="result-content">{result.content}</pre>
          <div className="result-footer">
            <span className="model-tag">Model: {result.model}</span>
            <button className="copy-btn" onClick={handleCopy}>
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
