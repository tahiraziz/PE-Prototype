/**
 * Clinical Timeline Component (Zone C - Bottom Full Width)
 * 
 * Horizontal scrollable strip showing PE-relevant clinical events:
 * - Prior CT/CTA/V/Q scans
 * - DVT/PE diagnoses
 * - Recent surgeries
 * 
 * Design: Horizontal scroll, cards, PE-relevant context only
 */

import { useMemo } from 'react';
import { 
  generateClinicalTimeline, 
  formatRelativeTime,
  type ClinicalTimelineEvent 
} from '../../utils/clinicalRules';
import './ClinicalTimeline.css';

// ===========================================================================
// Types
// ===========================================================================

interface ClinicalTimelineProps {
  data: {
    priorImaging?: Array<{ date: string; modality: string; result?: string }>;
    priorDVT?: { date?: string; diagnosed?: boolean };
    priorPE?: { date?: string; diagnosed?: boolean };
    recentSurgery?: { date?: string; type?: string };
    immobilization?: { date?: string; reason?: string };
  } | null;
  isLoading?: boolean;
  maxEvents?: number;
}

// ===========================================================================
// Sub-Components
// ===========================================================================

function TimelineCard({ event }: { event: ClinicalTimelineEvent }) {
  const relevanceColors = {
    high: 'relevance-high',
    medium: 'relevance-medium',
    low: 'relevance-low'
  };

  return (
    <div className={`timeline-card ${relevanceColors[event.relevance]}`}>
      <div className="card-icon">{event.icon}</div>
      <div className="card-content">
        <div className="card-time">{event.relativeTime}</div>
        <div className="card-title">{event.title}</div>
      </div>
      <div className={`card-relevance ${relevanceColors[event.relevance]}`}>
        {event.relevance === 'high' && '●'}
        {event.relevance === 'medium' && '○'}
      </div>
    </div>
  );
}

function EmptyTimeline() {
  return (
    <div className="timeline-empty">
      <span className="empty-icon">📋</span>
      <span className="empty-text">No PE-relevant history found</span>
    </div>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function ClinicalTimeline({ 
  data, 
  isLoading = false,
  maxEvents = 3 
}: ClinicalTimelineProps) {
  // Generate timeline events
  const events = useMemo(() => {
    if (!data) return [];
    return generateClinicalTimeline(data).slice(0, maxEvents);
  }, [data, maxEvents]);

  if (isLoading) {
    return (
      <div className="clinical-timeline loading">
        <div className="timeline-header">
          <span className="header-icon">🕐</span>
          <span className="header-title">Clinical Context</span>
        </div>
        <div className="timeline-scroll">
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="clinical-timeline">
      {/* Header */}
      <div className="timeline-header">
        <span className="header-icon">🕐</span>
        <span className="header-title">PE Context</span>
        <span className="header-count">{events.length} event{events.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Timeline Content */}
      {events.length === 0 ? (
        <EmptyTimeline />
      ) : (
        <div className="timeline-scroll">
          {events.map((event) => (
            <TimelineCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Compact Inline Timeline (for embedding)
// ===========================================================================

interface InlineTimelineProps {
  events: ClinicalTimelineEvent[];
  maxVisible?: number;
}

export function InlineTimeline({ events, maxVisible = 3 }: InlineTimelineProps) {
  const visibleEvents = events.slice(0, maxVisible);

  if (visibleEvents.length === 0) {
    return (
      <div className="inline-timeline empty">
        <span className="no-context">No PE-relevant context</span>
      </div>
    );
  }

  return (
    <div className="inline-timeline">
      {visibleEvents.map((event, idx) => (
        <div key={event.id} className="inline-event">
          <span className="inline-icon">{event.icon}</span>
          <span className="inline-title">{event.title}</span>
          <span className="inline-time">({event.relativeTime})</span>
          {idx < visibleEvents.length - 1 && (
            <span className="inline-separator">•</span>
          )}
        </div>
      ))}
    </div>
  );
}
