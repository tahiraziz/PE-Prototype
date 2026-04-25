/**
 * HUD Components Export
 * 
 * Heads-Up Display components for the Luminur PE Dashboard
 * "Safe Mode" Architecture - Apple Health inspired design
 */

// Main Dashboard Grid (the primary export)
export { default as DashboardGrid, transformFeaturesToGridData } from './DashboardGrid';
export type { FeatureSummary } from './DashboardGrid';

// Individual zone components (for advanced use)
export { default as DecisionTile } from './DecisionTile';
export { default as SafetyBadgeRow, RenalBadge, AllergyBadge, AnticoagBadge, DuplicateScanBadge } from './SafetyBadgeRow';
export { default as ClinicalTimeline, InlineTimeline } from './ClinicalTimeline';
