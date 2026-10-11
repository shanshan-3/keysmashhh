import { useMemo } from "react";
import LineChart, { chartScales } from "./LineChart.jsx";

export default function MissedKeysChart({ missed }) {
  const available =
    missed != null && typeof missed === "object" && !Array.isArray(missed);
  const entries = useMemo(
    () =>
      available
        ? Object.entries(missed)
            .filter(([, count]) => Number.isInteger(count) && count > 0)
            .sort(
              ([a, first], [b, second]) => second - first || a.localeCompare(b),
            )
        : [],
    [missed, available],
  );
  const shown = entries.slice(0, 12);
  const data = useMemo(
    () => ({
      labels: shown.map(([key]) => (key === " " ? "space" : key)),
      datasets: [
        {
          label: "Misses",
          data: shown.map(([, count]) => count),
          backgroundColor: getComputedStyle(document.documentElement)
            .getPropertyValue("--ink")
            .trim(),
          borderRadius: 0,
          maxBarThickness: 24,
        },
      ],
    }),
    [entries],
  );
  const scales = useMemo(() => {
    const base = chartScales(
      { type: "category" },
      Math.max(1, ...shown.map(([, count]) => count)),
      "Misses",
    );
    return {
      x: {
        ...base.y,
        type: "linear",
        ticks: { ...base.y.ticks, precision: 0 },
      },
      y: {
        ...base.x,
        ticks: { ...base.x.ticks, autoSkip: false },
        title: { display: false },
      },
    };
  }, [entries]);
  const tooltip = useMemo(
    () => ({
      label: (item) =>
        `${item.parsed.x} ${item.parsed.x === 1 ? "miss" : "misses"}`,
    }),
    [],
  );
  return (
    <div className="missed-keys">
      <h3>Missed keys</h3>
      {!available ? (
        <p className="empty-copy">
          Missed-key data is unavailable for this run.
        </p>
      ) : !entries.length ? (
        <p>No missed keys in this run.</p>
      ) : (
        <>
          <p className="muted">
            {entries.length > 12
              ? "The 12 most-missed keys. Every count is available below."
              : "Misses recorded during this run."}
          </p>
          <LineChart
            type="bar"
            indexAxis="y"
            data={data}
            scales={scales}
            tooltip={tooltip}
            height={Math.max(180, shown.length * 28 + 60)}
            label="Misses by key. Exact counts are available below."
          />
          <details className="sample-details">
            <summary>View all missed keys</summary>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Missed-key counts"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Key</th>
                    <th scope="col">Misses</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([key, count]) => (
                    <tr key={key}>
                      <th scope="row">{key === " " ? "space" : key}</th>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
