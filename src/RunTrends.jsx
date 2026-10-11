import { useMemo } from "react";
import LineChart, { chartScales } from "./LineChart.jsx";
import { formatMode } from "./history.js";

function Trend({ runs, metric, title, unit, max }) {
  const data = useMemo(
    () => ({
      labels: runs.map((run, index) => `Run ${index + 1}`),
      datasets: [
        {
          label: unit,
          data: runs.map((run) =>
            Number.isFinite(run[metric]) ? run[metric] : null,
          ),
          spanGaps: false,
        },
      ],
    }),
    [runs, metric, unit],
  );
  const scales = useMemo(
    () => chartScales({ type: "category" }, max, unit),
    [max, unit],
  );
  const tooltip = useMemo(
    () => ({
      title: (items) => {
        const run = runs[items[0]?.dataIndex];
        return run ? `${run.created_at} / ${formatMode(run.mode)}` : "";
      },
      label: (item) =>
        `${item.parsed.y}${unit === "%" ? "% accuracy" : " WPM"}`,
    }),
    [runs, unit],
  );
  return (
    <figure className="pace-chart">
      <figcaption className="chart-heading">
        <h3>{title}</h3>
      </figcaption>
      <LineChart
        data={data}
        scales={scales}
        tooltip={tooltip}
        label={`${title}. Runs are ordered oldest to newest. Exact scores are available below.`}
      />
    </figure>
  );
}

export default function RunTrends({ runs }) {
  const chronological = useMemo(() => [...runs].reverse(), [runs]);
  const ceiling = Math.max(
    20,
    Math.ceil(Math.max(0, ...runs.map((run) => run.wpm)) / 20) * 20,
  );
  if (!runs.length)
    return (
      <p className="empty-copy">
        No standard runs in this mode for recent-run trends. Custom practice is
        available in the run browser below.
      </p>
    );
  return (
    <>
      <div className="run-trends">
        <Trend
          runs={chronological}
          metric="wpm"
          title="WPM across recent runs"
          unit="WPM"
          max={ceiling}
        />
        <Trend
          runs={chronological}
          metric="acc"
          title="Accuracy across recent runs"
          unit="%"
          max={100}
        />
      </div>
      <details className="sample-details">
        <summary>View recent-run scores</summary>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Recent-run trend scores"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Run</th>
                <th scope="col">Finished (UTC)</th>
                <th scope="col">Mode</th>
                <th scope="col">WPM</th>
                <th scope="col">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {chronological.map((run, index) => (
                <tr key={run.id}>
                  <th scope="row">{index + 1}</th>
                  <td>{run.created_at}</td>
                  <td>{formatMode(run.mode)}</td>
                  <td>{run.wpm}</td>
                  <td>
                    {Number.isFinite(run.acc) ? `${run.acc}%` : "Unavailable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
