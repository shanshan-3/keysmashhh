import { useMemo } from "react";
import LineChart, { chartScales } from "./LineChart.jsx";

const EMPTY = [];

export default function PaceChart({
  samples = EMPTY,
  comparison = EMPTY,
  label = "WPM over time",
  kind = "pace",
  comparisonLabel = "Previous best",
  showRaw = false,
}) {
  const history = kind === "history";
  const points = useMemo(
    () =>
      (Array.isArray(samples) ? samples : EMPTY).filter((s) =>
        Number.isFinite(s?.second),
      ),
    [samples],
  );
  const pbPoints = useMemo(
    () =>
      (Array.isArray(comparison) ? comparison : EMPTY).filter((s) =>
        Number.isFinite(s?.second),
      ),
    [comparison],
  );
  const hasRaw =
    showRaw && !history && points.some((point) => Number.isFinite(point.raw));
  const data = useMemo(
    () => ({
      labels: history ? points.map((p) => p.label) : undefined,
      datasets: [
        ...(hasRaw
          ? [
              {
                label: "Raw WPM",
                data: points.map((p) => ({
                  x: p.second,
                  y: Number.isFinite(p.raw) ? p.raw : null,
                })),
                borderDash: [2, 3],
                borderWidth: 2,
                pointRadius: points.map((point, index) =>
                  Number.isFinite(point.raw) &&
                  !Number.isFinite(points[index - 1]?.raw) &&
                  !Number.isFinite(points[index + 1]?.raw)
                    ? 3
                    : 0,
                ),
                spanGaps: false,
              },
            ]
          : []),
        ...(pbPoints.length
          ? [
              {
                label: comparisonLabel,
                data: pbPoints.map((p) => ({
                  x: p.second,
                  y: Number.isFinite(p.net) ? p.net : null,
                })),
                borderDash: [6, 5],
                borderWidth: 2,
                pointRadius: pbPoints.map((point, index) =>
                  Number.isFinite(point.net) &&
                  !Number.isFinite(pbPoints[index - 1]?.net) &&
                  !Number.isFinite(pbPoints[index + 1]?.net)
                    ? 3
                    : 0,
                ),
              },
            ]
          : []),
        {
          label: history ? "Daily average" : showRaw ? "Net WPM" : "This run",
          data: points.map((p) => ({
            x: p.second,
            y: Number.isFinite(p.net) ? p.net : null,
          })),
          spanGaps: false,
          pointRadius: history
            ? 3
            : points.map((point, index) =>
                Number.isFinite(point.net) &&
                !Number.isFinite(points[index - 1]?.net) &&
                !Number.isFinite(points[index + 1]?.net)
                  ? 3
                  : 0,
              ),
        },
      ],
    }),
    [points, pbPoints, comparisonLabel, history, hasRaw, showRaw],
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
              ...points.map((p) => (Number.isFinite(p.net) ? p.net : 0)),
              ...pbPoints.map((p) => (Number.isFinite(p.net) ? p.net : 0)),
              ...(hasRaw
                ? points.filter((p) => Number.isFinite(p.raw)).map((p) => p.raw)
                : []),
            ) / 20,
          ) * 20,
        ),
      ),
    [points, pbPoints, history, hasRaw],
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
            <i /> {history ? "Daily average" : showRaw ? "Net WPM" : "This run"}
          </span>
          {hasRaw && (
            <span>
              <i className="dotted" /> Raw WPM
            </span>
          )}
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
      {showRaw && !history && !hasRaw && (
        <p className="muted">Raw WPM samples are unavailable for this run.</p>
      )}
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
                  <td>{Number.isFinite(p.net) ? p.net : "Unavailable"}</td>
                  {!history && (
                    <td>{Number.isFinite(p.raw) ? p.raw : "Unavailable"}</td>
                  )}
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
