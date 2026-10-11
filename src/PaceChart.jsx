import { useMemo } from "react";
import LineChart, { chartScales } from "./LineChart.jsx";

const EMPTY = [];

export default function PaceChart({
  samples = EMPTY,
  comparison = EMPTY,
  label = "WPM over time",
  kind = "pace",
  comparisonLabel = "Previous best",
}) {
  const history = kind === "history";
  const points = useMemo(
    () =>
      samples.filter(
        (s) => Number.isFinite(s.second) && Number.isFinite(s.net),
      ),
    [samples],
  );
  const pbPoints = useMemo(
    () =>
      comparison.filter(
        (s) => Number.isFinite(s.second) && Number.isFinite(s.net),
      ),
    [comparison],
  );
  const data = useMemo(
    () => ({
      labels: history ? points.map((p) => p.label) : undefined,
      datasets: [
        ...(pbPoints.length
          ? [
              {
                label: comparisonLabel,
                data: pbPoints.map((p) => ({ x: p.second, y: p.net })),
                borderDash: [6, 5],
                borderWidth: 2,
                pointRadius: pbPoints.length === 1 ? 3 : 0,
              },
            ]
          : []),
        {
          label: history ? "Daily average" : "This run",
          data: points.map((p) => ({ x: p.second, y: p.net })),
          pointRadius: points.length === 1 || history ? 3 : 0,
        },
      ],
    }),
    [points, pbPoints, comparisonLabel, history],
  );
  const scales = useMemo(
    () =>
      chartScales(
        {
          type: "linear",
          min: 0,
          max: Math.max(
            1,
            ...points.map((p) => p.second),
            ...pbPoints.map((p) => p.second),
          ),
          ticks: {
            callback: (value) =>
              history
                ? points.find((p) => p.second === value)?.label?.slice(5) || ""
                : `${Number(Number(value).toFixed(1))}s`,
          },
          ...(history
            ? {
                afterBuildTicks: (axis) => {
                  const step = Math.max(1, Math.ceil(points.length / 5));
                  axis.ticks = points
                    .filter((_, i) => i % step === 0 || i === points.length - 1)
                    .map((p) => ({ value: p.second }));
                },
              }
            : {}),
        },
        Math.max(
          20,
          Math.ceil(
            Math.max(
              0,
              ...points.map((p) => p.net),
              ...pbPoints.map((p) => p.net),
            ) / 20,
          ) * 20,
        ),
      ),
    [points, pbPoints, history],
  );
  const tooltip = useMemo(
    () => ({
      title: (items) =>
        history
          ? points.find((p) => p.second === items[0]?.parsed.x)?.label || ""
          : `${Number(items[0]?.parsed.x.toFixed(2))}s`,
      label: (item) => `${item.dataset.label}: ${item.parsed.y} WPM`,
    }),
    [points, history],
  );

  if (!points.length)
    return (
      <p className="empty-copy">
        {history
          ? "Complete a test to start your progress chart."
          : "This run has no pace samples. Complete another test to record a curve."}
      </p>
    );
  return (
    <figure className="pace-chart">
      <figcaption className="chart-heading">
        <h3>{label}</h3>
        <div className="chart-legend">
          <span>
            <i /> {history ? "Daily average" : "This run"}
          </span>
          {pbPoints.length > 0 && (
            <span>
              <i className="dashed" /> {comparisonLabel}
            </span>
          )}
        </div>
      </figcaption>
      <LineChart
        data={data}
        scales={scales}
        tooltip={tooltip}
        label={`${label}. ${points.length} recorded ${history ? "days" : "intervals"}. Measurements are available below.`}
      />
      <details className="sample-details">
        <summary>
          {history ? "View daily averages" : "View pace measurements"}
        </summary>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label={history ? "Daily averages" : "Pace measurements"}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">{history ? "Date" : "Seconds"}</th>
                <th scope="col">{history ? "Average WPM" : "Net WPM"}</th>
                {!history && <th scope="col">Raw WPM</th>}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.second}>
                  <td>{history ? p.label : Number(p.second.toFixed(2))}</td>
                  <td>{p.net}</td>
                  {!history && <td>{p.raw}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {pbPoints.length > 0 && (
            <table>
              <caption>{comparisonLabel}</caption>
              <thead>
                <tr>
                  <th scope="col">Seconds</th>
                  <th scope="col">Net WPM</th>
                </tr>
              </thead>
              <tbody>
                {pbPoints.map((point) => (
                  <tr key={point.second}>
                    <td>{Number(point.second.toFixed(2))}</td>
                    <td>{point.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </details>
    </figure>
  );
}
