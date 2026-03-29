import { useState, useEffect } from "react";

const SIZE_OPTIONS = ["square", "portrait", "landscape"];
const STYLE_OPTIONS = [
  "photorealistic",
  "illustration",
  "watercolor",
  "cinematic",
  "minimal",
  "vintage",
];

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("square");
  const [style, setStyle] = useState("photorealistic");
  const [negativePrompt, setNegativePrompt] = useState("blurry, low quality, distorted");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  useEffect(() => {
    loadGallery();
  }, []);

  async function loadGallery() {
    setGalleryLoading(true);
    try {
      const res = await fetch("/api/ai/images?limit=12");
      if (res.ok) {
        setGallery(await res.json());
      }
    } catch {
      // Gallery load failure is non-critical
    } finally {
      setGalleryLoading(false);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setCurrentImage(null);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          size,
          style_preset: style,
          negative_prompt: negativePrompt,
          return_base64: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Image generation failed");
      }
      const data = await res.json();
      setCurrentImage(data);
      loadGallery();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="image-generator">
      <h2>AI Image Generator</h2>
      <p className="subtitle">Powered by Stable Diffusion (open-source)</p>

      <form onSubmit={handleGenerate} className="generator-form">
        <label>
          Image Prompt
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            rows={3}
            required
          />
        </label>

        <div className="form-row">
          <label>
            Size
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {STYLE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Negative Prompt
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Things to avoid in the image..."
          />
        </label>

        <button type="submit" disabled={loading || !prompt.trim()}>
          {loading ? "Generating image…" : "Generate Image"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="loading-indicator">
          <div className="spinner" />
          <p>Generating your image with Stable Diffusion…</p>
        </div>
      )}

      {currentImage && (
        <div className="current-image-card">
          <img
            src={`data:image/png;base64,${currentImage.base64}`}
            alt={currentImage.prompt}
            className="generated-image"
          />
          <div className="image-meta">
            <span>{currentImage.size}</span>
            <span>{currentImage.style}</span>
            <a
              href={`data:image/png;base64,${currentImage.base64}`}
              download={currentImage.filename}
              className="download-btn"
            >
              Download
            </a>
          </div>
        </div>
      )}

      <section className="gallery">
        <h3>Generated Images Gallery</h3>
        {galleryLoading && <p>Loading gallery…</p>}
        <div className="gallery-grid">
          {gallery.map((img) => (
            <div key={img.id} className="gallery-item">
          <img src={`/media/images/${img.filename || img.file_path.split("/").pop()}`} alt={img.prompt} />
              <p className="gallery-caption">{img.prompt}</p>
              <span className="gallery-date">{new Date(img.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {gallery.length === 0 && !galleryLoading && (
            <p className="empty-gallery">No images generated yet. Create your first!</p>
          )}
        </div>
      </section>
    </div>
  );
}
