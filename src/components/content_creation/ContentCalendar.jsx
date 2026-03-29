import { useState } from "react";

const PLATFORMS = ["Twitter", "Instagram", "LinkedIn", "TikTok", "Facebook", "YouTube"];

const DEFAULT_EVENTS = [];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getWeekDays(referenceDate = new Date()) {
  const days = [];
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${year}-${month}-${day}`);
  }
  return days;
}

export default function ContentCalendar({ generatedContent = [] }) {
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({
    title: "",
    platform: "Instagram",
    content: "",
    time: "09:00",
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [scheduleStatus, setScheduleStatus] = useState({});

  const referenceDate = new Date();
  referenceDate.setDate(referenceDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(referenceDate);

  function openModal(date, prefillContent = "") {
    setSelectedDate(date);
    setForm((f) => ({ ...f, content: prefillContent, title: "" }));
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedDate(null);
  }

  function handleAddEvent(e) {
    e.preventDefault();
    if (!form.title.trim() || !selectedDate) return;
    const newEvent = {
      id: Date.now(),
      date: selectedDate,
      title: form.title,
      platform: form.platform,
      content: form.content,
      time: form.time,
      status: "draft",
    };
    setEvents((prev) => [...prev, newEvent]);
    closeModal();
  }

  async function handleSchedule(event) {
    setScheduleStatus((s) => ({ ...s, [event.id]: "scheduling" }));
    try {
      // Placeholder: in production, POST to platform OAuth connector
      await new Promise((r) => setTimeout(r, 1200));
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, status: "scheduled" } : e))
      );
      setScheduleStatus((s) => ({ ...s, [event.id]: "scheduled" }));
    } catch {
      setScheduleStatus((s) => ({ ...s, [event.id]: "error" }));
    }
  }

  function handleDelete(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const eventsForDay = (date) => events.filter((e) => e.date === date);

  return (
    <div className="content-calendar">
      <div className="calendar-header">
        <h2>Content Calendar</h2>
        <div className="week-nav">
          <button onClick={() => setWeekOffset((o) => o - 1)}>← Prev Week</button>
          <span>
            {formatDate(weekDays[0])} – {formatDate(weekDays[6])}
          </span>
          <button onClick={() => setWeekOffset((o) => o + 1)}>Next Week →</button>
        </div>
      </div>

      {generatedContent.length > 0 && (
        <div className="generated-suggestions">
          <h3>Schedule Generated Content</h3>
          <div className="suggestions-list">
            {generatedContent.map((item, idx) => (
              <div key={idx} className="suggestion-item">
                <p>{item.content?.substring(0, 80)}…</p>
                <button
                  onClick={() => openModal(weekDays[idx % 7], item.content)}
                  className="schedule-btn small"
                >
                  + Add to Calendar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="calendar-grid">
        {weekDays.map((day) => (
          <div key={day} className="calendar-day">
            <div className="day-header">
              <span className="day-label">{formatDate(day)}</span>
              <button className="add-event-btn" onClick={() => openModal(day)}>
                +
              </button>
            </div>
            <div className="day-events">
              {eventsForDay(day).map((event) => (
                <div key={event.id} className={`event-card status-${event.status}`}>
                  <div className="event-top">
                    <span className="event-platform">{event.platform}</span>
                    <span className="event-time">{event.time}</span>
                  </div>
                  <p className="event-title">{event.title}</p>
                  <p className="event-preview">{event.content?.substring(0, 60)}…</p>
                  <div className="event-actions">
                    {event.status === "draft" && (
                      <button
                        className="schedule-btn"
                        onClick={() => handleSchedule(event)}
                        disabled={scheduleStatus[event.id] === "scheduling"}
                      >
                        {scheduleStatus[event.id] === "scheduling"
                          ? "Scheduling…"
                          : "Schedule"}
                      </button>
                    )}
                    {event.status === "scheduled" && (
                      <span className="status-badge scheduled">✅ Scheduled</span>
                    )}
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(event.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add to Calendar — {formatDate(selectedDate)}</h3>
            <form onSubmit={handleAddEvent} className="generator-form">
              <label>
                Title
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Post title..."
                  required
                />
              </label>
              <label>
                Platform
                <select
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Scheduled Time
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
              </label>
              <label>
                Content
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={4}
                  placeholder="Post content..."
                />
              </label>
              <div className="modal-actions">
                <button type="submit">Add Event</button>
                <button type="button" onClick={closeModal} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
