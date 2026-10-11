import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import { formatMode, loadHistory } from "./history.js";
import PaceChart from "./PaceChart.jsx";
import MissedKeysChart from "./MissedKeysChart.jsx";
import RunTrends from "./RunTrends.jsx";
import useRunHistory from "./useRunHistory.js";
import { RUN_PAGE_SIZE } from "./cloudHistory.js";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export default function Stats({
  user,
  onLogin,
  onBack,
  freshRun,
  embedded = false,
  cloudModes = [],
}) {
  const [source, setSource] = useState("local");
  const [mode, setMode] = useState("all");
  const [discovered, setDiscovered] = useState({ account: null, modes: [] });
  const detailHeading = useRef(null);
  const focusDetail = useRef(false);
  const localRuns = useMemo(
    () =>
      [...loadHistory()].sort(
        (a, b) =>
          b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
      ),
    [freshRun],
  );
  const history = useRunHistory({
    source,
    userId: user?.id,
    mode,
    freshRun,
    localRuns,
  });
  const modeKey = history.modes.join("|");
  useEffect(() => {
    if (source !== "cloud" || !user?.id) return;
    setDiscovered((previous) => ({
      account: user.id,
      modes: [
        ...new Set([
          ...(previous.account === user.id ? previous.modes : []),
          ...history.modes,
        ]),
      ],
    }));
  }, [modeKey, source, user?.id]);
  useEffect(() => {
    if (focusDetail.current && history.selected) {
      focusDetail.current = false;
      detailHeading.current?.focus();
      detailHeading.current?.scrollIntoView({ block: "nearest" });
    }
  }, [history.selected?.id]);

  const modes = [
    ...new Set(
      source === "local"
        ? localRuns.map((run) => run.mode)
        : [
            ...cloudModes,
            ...(discovered.account === user?.id ? discovered.modes : []),
            ...history.modes,
            ...(mode === "all" ? [] : [mode]),
          ],
    ),
  ];
  const recent = history.overview;
  const daily = useMemo(() => {
    const days = new Map();
    for (const run of recent) {
      const day = run.created_at.slice(0, 10);
      const values = days.get(day) || [];
      values.push(run.wpm);
      days.set(day, values);
    }
    return [...days]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, values], index) => ({
        label,
        second: index + 1,
        net: Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        ),
      }));
  }, [recent]);
  const bests = {};
  for (const run of recent)
    if (!bests[run.mode] || run.wpm > bests[run.mode].wpm)
      bests[run.mode] = run;
  const selectedIndex = history.rows.findIndex(
    (run) => run.id === history.selected?.id,
  );
  function selectRun(run) {
    history.select(run.id);
    // Selecting the already active row still takes keyboard users to its charts.
    requestAnimationFrame(() => {
      detailHeading.current?.focus();
      detailHeading.current?.scrollIntoView({ block: "nearest" });
    });
  }
  function changePage(index, edge = "first") {
    focusDetail.current = true;
    history.pageTo(index, edge);
  }
  function adjacent(direction) {
    const next = history.rows[selectedIndex + direction];
    if (next) selectRun(next);
    else changePage(history.page + direction, direction < 0 ? "last" : "first");
  }
  function changeSource(next) {
    focusDetail.current = false;
    setSource(next);
    setMode("all");
  }

  return (
    <div className="stats-page">
      <div className="page-heading">
        <div>
          {embedded ? (
            <h2 id="history" tabIndex={-1}>
              Your record.
            </h2>
          ) : (
            <h1 tabIndex={-1}>Your record.</h1>
          )}
          <p>Browse your runs. Inspect your pace and missed keys.</p>
        </div>
        <button className="brutal-btn" onClick={onBack}>
          Back to typing
        </button>
      </div>
      <div className="history-toolbar">
        <div className="segmented" role="group" aria-label="History source">
          <button
            aria-pressed={source === "local"}
            onClick={() => changeSource("local")}
          >
            This device
          </button>
          {supabase && (
            <button
              aria-pressed={source === "cloud"}
              onClick={() => changeSource("cloud")}
            >
              Cloud
            </button>
          )}
        </div>
        <p className="muted">
          {source === "local"
            ? "Up to 50 runs retained in this browser."
            : "Browse every cloud-saved run, newest first."}
        </p>
      </div>
      {source === "cloud" && !user ? (
        <section className="state-panel">
          <h2>Keep your runs across devices.</h2>
          <p>
            Log in to view cloud history. Your local runs are available on this
            device.
          </p>
          <button className="brutal-btn primary" onClick={onLogin}>
            Log in
          </button>
        </section>
      ) : (
        <>
          <label className="mode-filter">
            Compare a mode
            <select
              value={mode}
              onChange={(event) => {
                focusDetail.current = false;
                setMode(event.target.value);
              }}
            >
              <option value="all">All modes</option>
              {modes.map((value) => (
                <option key={value} value={value}>
                  {formatMode(value)}
                </option>
              ))}
            </select>
          </label>
          <section className="history-chart" aria-label="Recent-run overview">
            <div className="section-heading">
              <h2>Recent-run trends</h2>
              <p>
                Latest {recent.length} standard{" "}
                {recent.length === 1 ? "run" : "runs"}
                {mode === "all"
                  ? " across all modes"
                  : ` in ${formatMode(mode)}`}
                . Custom practice is excluded. Browsing older pages does not
                change these trends.
              </p>
            </div>
            {history.overviewLoading ? (
              <p role="status" className="empty-copy">
                Loading recent-run trends...
              </p>
            ) : history.overviewError ? (
              <div role="alert">
                <p>{history.overviewError}</p>
                <button className="brutal-btn" onClick={history.retryOverview}>
                  Retry recent-run trends
                </button>
              </div>
            ) : (
              <>
                {recent.length > 0 && (
                  <dl className="history-summary">
                    <div>
                      <dt>Recent standard runs</dt>
                      <dd>{recent.length}</dd>
                    </div>
                    <div>
                      <dt>Best recent WPM</dt>
                      <dd>{Math.max(...recent.map((run) => run.wpm))}</dd>
                    </div>
                    <div>
                      <dt>Average recent WPM</dt>
                      <dd>
                        {Math.round(
                          recent.reduce((sum, run) => sum + run.wpm, 0) /
                            recent.length,
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
                <RunTrends runs={recent} />
                {recent.length > 0 && (
                  <>
                    <PaceChart
                      kind="history"
                      samples={daily}
                      label={`Daily average WPM: ${daily[0]?.label} to ${daily.at(-1)?.label} UTC`}
                    />
                    <details className="sample-details">
                      <summary>
                        View best scores by mode in these recent runs
                      </summary>
                      <div className="best-list">
                        {Object.values(bests).map((run) => (
                          <div key={run.mode}>
                            <span>{formatMode(run.mode)}</span>
                            <strong>
                              {run.wpm} <small>WPM</small>
                            </strong>
                            <span>{run.acc}% accuracy</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                )}
              </>
            )}
          </section>
          {history.selected && (
            <section
              className="history-chart run-detail"
              aria-labelledby="run-detail-heading"
            >
              <div className="section-heading">
                <h2 id="run-detail-heading" ref={detailHeading} tabIndex={-1}>
                  Charts for this run
                </h2>
                <p>
                  {formatMode(history.selected.mode)} /{" "}
                  {fmtDate(history.selected.created_at)}
                </p>
              </div>
              <p className="run-score" role="status">
                {history.selected.wpm} WPM / {history.selected.acc}% accuracy
              </p>
              <div
                className="run-pagination"
                role="group"
                aria-label="Browse individual runs"
              >
                <button
                  className="brutal-btn"
                  disabled={
                    history.loading ||
                    (selectedIndex === 0 && history.page === 0)
                  }
                  onClick={() => adjacent(-1)}
                >
                  Previous run
                </button>
                <button
                  className="brutal-btn"
                  disabled={
                    history.loading ||
                    (selectedIndex === history.rows.length - 1 &&
                      !history.hasMore)
                  }
                  onClick={() => adjacent(1)}
                >
                  Next run
                </button>
              </div>
              {history.detailLoading ? (
                <p className="empty-copy" role="status">
                  Loading charts for this run...
                </p>
              ) : history.detailError ? (
                <div role="alert">
                  <p>{history.detailError}</p>
                  <button className="brutal-btn" onClick={history.retryDetails}>
                    Retry run charts
                  </button>
                </div>
              ) : (
                history.details && (
                  <>
                    <PaceChart
                      samples={
                        Array.isArray(history.details.samples)
                          ? history.details.samples
                          : []
                      }
                      showRaw
                      label="Net and raw WPM during this run"
                    />
                    <MissedKeysChart missed={history.details.missed_keys} />
                  </>
                )
              )}
            </section>
          )}
          <section className="run-browser" aria-label="Saved run browser">
            <div className="section-heading">
              <h2>Saved runs</h2>
              <p>20 runs per page. Choose a run to view its charts above.</p>
            </div>
            {history.loading && <p role="status">Loading cloud runs...</p>}
            {history.pageError && (
              <div role="alert">
                <p>{history.pageError}</p>
                <button
                  className="brutal-btn"
                  onClick={() => {
                    focusDetail.current = true;
                    history.retryPage();
                  }}
                >
                  Retry cloud history
                </button>
              </div>
            )}
            {!history.loading && !history.pageError && !history.rows.length && (
              <div className="state-panel">
                <h3>
                  {mode === "all"
                    ? "No finished runs yet."
                    : "No saved runs in this mode."}
                </h3>
                <p>
                  {mode === "all"
                    ? "Complete a typing test to see its scores and charts here."
                    : "Choose another mode or complete a test in this mode."}
                </p>
                <button className="brutal-btn" onClick={onBack}>
                  Start a test
                </button>
              </div>
            )}
            {history.rows.length > 0 && (
              <>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Saved runs"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Finished</th>
                        <th scope="col">Mode</th>
                        <th scope="col">WPM</th>
                        <th scope="col">Accuracy</th>
                        <th scope="col">Charts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.rows.map((run) => (
                        <tr
                          key={run.id}
                          className={
                            history.selected?.id === run.id
                              ? "selected-row"
                              : ""
                          }
                        >
                          <td>{fmtDate(run.created_at)}</td>
                          <td>{formatMode(run.mode)}</td>
                          <td>{run.wpm}</td>
                          <td>{run.acc}%</td>
                          <td>
                            <button
                              className="score-link"
                              aria-pressed={history.selected?.id === run.id}
                              aria-label={`View charts for ${run.wpm} WPM run from ${fmtDate(run.created_at)}`}
                              onClick={() => selectRun(run)}
                            >
                              View charts
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div
                  className="run-pagination"
                  role="group"
                  aria-label="Run history pages"
                >
                  <button
                    className="brutal-btn"
                    disabled={history.loading || history.page === 0}
                    onClick={() => changePage(history.page - 1)}
                  >
                    Previous page
                  </button>
                  <p role="status">
                    Page {history.page + 1} / Runs{" "}
                    {history.page * RUN_PAGE_SIZE + 1}–
                    {history.page * RUN_PAGE_SIZE + history.rows.length}
                  </p>
                  <button
                    className="brutal-btn"
                    disabled={history.loading || !history.hasMore}
                    onClick={() => changePage(history.page + 1)}
                  >
                    Next page
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
