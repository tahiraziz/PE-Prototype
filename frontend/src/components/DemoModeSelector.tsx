import { DEMO_SCENARIOS } from '../data/demoData';
import type { DemoScenario } from '../types/assessment';

interface DemoModeSelectorProps {
  selectedScenarioId: string;
  onSelectScenario: (scenario: DemoScenario) => void;
}

/**
 * Compact horizontal demo scenario picker
 */
export default function DemoModeSelector({ selectedScenarioId, onSelectScenario }: DemoModeSelectorProps) {
  return (
    <div className="demo-selector">
      {DEMO_SCENARIOS.map((scenario) => (
        <button
          key={scenario.id}
          className={`demo-option ${selectedScenarioId === scenario.id ? 'selected' : ''} ${
            scenario.data.decision === 'rule_out' ? 'option-ruleout' : 'option-continue'
          }`}
          onClick={() => onSelectScenario(scenario)}
        >
          <span className="option-dot"></span>
          <span className="option-name">{scenario.name}</span>
        </button>
      ))}
    </div>
  );
}
