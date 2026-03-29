import { useState, useRef, useEffect } from "react";

const BARK_PRESETS = [
  "v2/en_speaker_0",
  "v2/en_speaker_1",
  "v2/en_speaker_2",
  "v2/en_speaker_3",
  "v2/en_speaker_4",
  "v2/en_speaker_5",
  "v2/en_speaker_6",
  "v2/en_speaker_7",
  "v2/en_speaker_8",
  "v2/en_speaker_9",
];

export default function VoiceBox() {
  const [activeTab, setActiveTab] = useState("synthesize");

  // Synthesize state
  const [synthText, setSynthText] = useState("");
  const [speakerPreset, setSpeakerPreset] = useState("v2/en_speaker_6");
  const [synthResult, setSynthResult] = useState(null);
  const [synthLoading, setSynthLoading] = useState(false);

  // Clone state
  const [cloneText, setCloneText] = useState("");
  const [referenceFile, setReferenceFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [cloneResult, setCloneResult] = useState(null);
  const [cloneLoading, setCloneLoading] = useState(false);

  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function handleSynthesize(e) {
    e.preventDefault();
    if (!synthText.trim()) return;
    setSynthLoading(true);
    setError(null);
    setSynthResult(null);
    try {
      const res = await fetch("/api/ai/voicebox/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: synthText, speaker_preset: speakerPreset }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Synthesis failed");
      const data = await res.json();
      setSynthResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSynthLoading(false);
    }
  }

  async function handleClone(e) {
    e.preventDefault();
    if (!cloneText.trim()) return;
    const audioFile = recordedBlob || referenceFile;
    if (!audioFile) {
      setError("Please record or upload a reference audio sample.");
      return;
    }
    setCloneLoading(true);
    setError(null);
    setCloneResult(null);
    try {
      const formData = new FormData();
      formData.append("text", cloneText);
      const filename = referenceFile ? referenceFile.name : "recording.wav";
      formData.append("reference_audio", audioFile, filename);
      const res = await fetch("/api/ai/voicebox/clone", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Voice cloning failed");
      const data = await res.json();
      setCloneResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCloneLoading(false);
    }
  }

  async function startRecording() {
    setError(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied: " + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  function getAudioSrc(filePath) {
    if (!filePath) return null;
    return `/media/audio/${filePath.split("/").pop()}`;
  }

  return (
    <div className="voicebox">
      <h2>VoiceBox</h2>
      <p className="subtitle">
        Voice Synthesis (Bark) &amp; Voice Cloning (OpenVoice) — open-source
      </p>

      <div className="studio-tabs">
        {["synthesize", "clone"].map((tab) => (
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

      {activeTab === "synthesize" && (
        <form onSubmit={handleSynthesize} className="generator-form">
          <label>
            Text to Synthesize
            <textarea
              value={synthText}
              onChange={(e) => setSynthText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              rows={4}
              required
            />
          </label>
          <label>
            Speaker Preset
            <select
              value={speakerPreset}
              onChange={(e) => setSpeakerPreset(e.target.value)}
            >
              {BARK_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={synthLoading || !synthText.trim()}>
            {synthLoading ? "Synthesizing…" : "Synthesize Voice"}
          </button>
          {synthResult && (
            <div className="audio-result">
              <p>✅ Voice synthesized</p>
              <audio controls src={getAudioSrc(synthResult.file_path)} />
            </div>
          )}
        </form>
      )}

      {activeTab === "clone" && (
        <form onSubmit={handleClone} className="generator-form">
          <label>
            Text to Speak in Cloned Voice
            <textarea
              value={cloneText}
              onChange={(e) => setCloneText(e.target.value)}
              placeholder="Enter text to speak in the cloned voice..."
              rows={4}
              required
            />
          </label>

          <fieldset className="reference-audio">
            <legend>Reference Audio Sample</legend>
            <div className="record-controls">
              {!isRecording ? (
                <button type="button" className="record-btn" onClick={startRecording}>
                  🎙 Start Recording
                </button>
              ) : (
                <button type="button" className="stop-btn" onClick={stopRecording}>
                  ⏹ Stop Recording
                </button>
              )}
              {recordedBlob && (
                <audio controls src={URL.createObjectURL(recordedBlob)} />
              )}
            </div>
            <p className="divider">— or upload a file —</p>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                setReferenceFile(e.target.files[0] || null);
                setRecordedBlob(null);
              }}
            />
          </fieldset>

          <button
            type="submit"
            disabled={cloneLoading || !cloneText.trim() || (!recordedBlob && !referenceFile)}
          >
            {cloneLoading ? "Cloning voice…" : "Clone Voice"}
          </button>

          {cloneResult && (
            <div className="audio-result">
              <p>✅ Voice cloned</p>
              <audio controls src={getAudioSrc(cloneResult.file_path)} />
            </div>
          )}
        </form>
      )}
    </div>
  );
}
