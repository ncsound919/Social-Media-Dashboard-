import { useState, useEffect, useRef } from "react";

const RESOLUTION_OPTIONS = ["sd", "hd"];
const POLL_INTERVAL_MS = 3000;
const MAX_DURATION = 8;

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(3);
  const [resolution, setResolution] = useState("sd");
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobResult, setJobResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(id) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/generate-video/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        setJobStatus(data.status);
        if (data.status === "SUCCESS" || data.status === "FAILURE") {
          clearInterval(pollRef.current);
          setJobResult(data.result);
          setLoading(false);
        }
      } catch {
        // ignore transient poll errors
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setJobResult(null);
    try {
      const res = await fetch("/api/ai/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration_seconds: duration, resolution }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to enqueue video job");
      }
      const data = await res.json();
      setJobId(data.job_id);
      setJobStatus("PENDING");
      startPolling(data.job_id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function getProgressLabel() {
    if (!jobStatus) return "";
    const labels = {
      PENDING: "Job queued…",
      STARTED: "Generating video…",
      RETRY: "Retrying…",
      SUCCESS: "Done!",
      FAILURE: "Failed",
    };
    return labels[jobStatus] || jobStatus;
  }

  function getProgressValue() {
    const values = { PENDING: 10, STARTED: 50, RETRY: 50, SUCCESS: 100, FAILURE: 100 };
    return values[jobStatus] || 0;
  }

  return (
    <div className="video-generator">
      <h2>AI Video Generator</h2>
      <p className="subtitle">Powered by ModelScope text-to-video (open-source)</p>

      <form onSubmit={handleGenerate} className="generator-form">
        <label>
          Video Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video scene you want to generate..."
            rows={3}
            required
          />
        </label>

        <div className="form-row">
          <label>
            Duration: {duration}s
            <input
              type="range"
              min={1}
              max={MAX_DURATION}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>

          <label>
            Resolution
            <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
              {RESOLUTION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" disabled={loading || !prompt.trim()}>
          {loading ? "Processing…" : "Generate Video"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {jobId && (
        <div className="job-status-card">
          <p>
            Job ID: <code>{jobId}</code>
          </p>
          <p>Status: <strong>{getProgressLabel()}</strong></p>
          <div className="progress-bar-container">
            <div
              className={`progress-bar ${jobStatus === "FAILURE" ? "failure" : ""}`}
              style={{ width: `${getProgressValue()}%` }}
            />
          </div>

          {jobStatus === "SUCCESS" && jobResult?.file_path && (
            <div className="video-result">
              <video
                controls
                src={`/media/videos/${jobResult.filename || jobResult.file_path.split("/").pop()}`}
                className="generated-video"
              />
              <p>{jobResult.prompt}</p>
            </div>
          )}

          {jobStatus === "FAILURE" && (
            <div className="error-message">
              {jobResult?.error || "Video generation failed. Please try again."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
