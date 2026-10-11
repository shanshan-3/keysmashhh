import { ghostOutcome, ghostPace } from "./ghosts.js";
import { formatMode } from "./history.js";
import PaceChart from "./PaceChart.jsx";
import MissedKeysChart from "./MissedKeysChart.jsx";

export default function RunResults({
  ref,
  result,
  ghost,
  challengedHandle,
  custom,
  pb,
  saveStatus,
  onRestart,
  onRematch,
  onBack,
  onHistory,
}) {
  return (
    <section
      className="results"
      ref={ref}
      tabIndex={-1}
      aria-label="Test results"
      onKeyDown={(e) => {
        if (e.key === "Tab" && !e.shiftKey && e.target === e.currentTarget) {
          e.preventDefault();
          onRestart();
        }
      }}
    >
      <div className="result-heading">
        <h2>That's your run.</h2>
        {result.isBest && <span className="best-stamp">New personal best</span>}
      </div>
      {ghost && (
        <div className="ghost-result">
          <h3>{ghostOutcome(result, ghost)}</h3>
          <p>
            {challengedHandle && `Challenged ${challengedHandle}. `}
            Your {result.wpm} WPM / {result.acc}% accuracy versus ghost{" "}
            {ghost.wpm} WPM / {ghost.accuracy}% accuracy.
          </p>
          <p>
            {result.wpm - ghost.wpm >= 0 ? "+" : ""}
            {result.wpm - ghost.wpm} WPM /{" "}
            {Number((result.acc - ghost.accuracy).toFixed(1)) >= 0 ? "+" : ""}
            {Number((result.acc - ghost.accuracy).toFixed(1))} accuracy points
          </p>
        </div>
      )}
      <div className="result-hero">
        <div>
          <span className="metric-label">Words per minute</span>
          <strong>{result.wpm}</strong>
        </div>
        <div>
          <span className="metric-label">Accuracy</span>
          <strong>
            {result.acc}
            <small>%</small>
          </strong>
        </div>
      </div>
      <PaceChart
        samples={result.samples}
        showRaw
        comparison={ghost ? ghostPace(ghost) : result.previous?.samples || []}
        comparisonLabel={ghost ? "Challenged ghost" : "Previous best"}
      />
      {!custom && !ghost && !result.previous?.samples?.length && (
        <p className="comparison-note">
          {result.previous
            ? "Your earlier best has no pace samples. Future bests will include a comparison curve."
            : "First recorded run in this mode. Your next run can compare against this curve."}
        </p>
      )}
      <dl className="result-details">
        <div>
          <dt>Raw WPM</dt>
          <dd>{result.raw}</dd>
        </div>
        <div>
          <dt>Net WPM</dt>
          <dd>{result.wpm}</dd>
        </div>
        <div>
          <dt>Consistency</dt>
          <dd>{result.consistency}%</dd>
        </div>
        <div>
          <dt>Elapsed</dt>
          <dd>{Number(result.elapsed_s.toFixed(2))}s</dd>
        </div>
      </dl>
      <MissedKeysChart missed={result.missed_keys} />
      <div className="result-actions">
        <button className="brutal-btn primary" onClick={() => onRestart()}>
          {ghost ? "Rematch" : "Type again"} <kbd>Tab</kbd>
        </button>
        {!ghost && pb && (
          <button className="brutal-btn" onClick={onRematch}>
            Race your best
          </button>
        )}
        {ghost && (
          <button className="brutal-btn" onClick={() => onBack()}>
            Leave race
          </button>
        )}
        <button className="text-button" onClick={() => onHistory()}>
          View history
        </button>
      </div>
      <div className="result-meta">
        <span>{formatMode(result.mode)}</span>
        {ghost && (
          <span>
            {result.wpm - ghost.wpm >= 0 ? "+" : ""}
            {result.wpm - ghost.wpm} WPM vs ghost
          </span>
        )}
        <p role="status">{saveStatus}</p>
      </div>
    </section>
  );
}
