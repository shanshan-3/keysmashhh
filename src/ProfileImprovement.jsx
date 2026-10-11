import { useId, useMemo, useState } from "react";
import LineChart, { chartScales } from "./LineChart.jsx";
import { formatMode } from "./history.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ranges = [
  { weeks: 12, label: "12 weeks" },
  { weeks: 26, label: "6 months" },
  { weeks: 52, label: "1 year" },
];

function currentUtcWeek() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.getTime();
}

export default function ProfileImprovement({ modes, trends }) {
  const id = useId();
  const [chosenMode, setChosenMode] = useState("");
  const [weeks, setWeeks] = useState(12);
  const mode =
    modes.find((record) => record.mode === chosenMode)?.mode ||
    modes[0]?.mode ||
    "";
  const currentWeek = currentUtcWeek();
  const buckets = useMemo(() => {
    const values = new Map(
      (trends || [])
        .filter((entry) => entry.mode === mode)
        .map((entry) => [entry.week_start, entry]),
    );
    return Array.from({ length: weeks }, (_, index) => {
      const week = new Date(currentWeek - (weeks - index - 1) * WEEK_MS)
        .toISOString()
        .slice(0, 10);
      return { week, value: values.get(week) };
    });
  }, [trends, mode, weeks, currentWeek]);
  const measured = buckets.filter((bucket) => bucket.value);
  const latest = buckets.findLastIndex((bucket) => bucket.value);
  const ceiling = Math.max(
    10,
    Math.ceil(
      Math.max(
        0,
        ...measured.map((bucket) => Number(bucket.value.average_wpm)),
      ) / 10,
    ) * 10,
  );
  const data = useMemo(() => {
    const palette = getComputedStyle(document.documentElement);
    const ink = palette.getPropertyValue("--ink").trim();
    const accent = palette.getPropertyValue("--accent").trim();
    return {
      labels: buckets.map((bucket) => bucket.week),
      datasets: [
        {
          label: "Weekly average",
          data: buckets.map((bucket) =>
            bucket.value ? Number(bucket.value.average_wpm) : null,
          ),
          stepped: "before",
          spanGaps: false,
          borderWidth: 2,
          pointStyle: "rect",
          pointRadius: buckets.map((_, index) => (index === latest ? 5 : 3)),
          pointBackgroundColor: buckets.map((_, index) =>
            index === latest ? accent : ink,
          ),
          pointBorderColor: ink,
          pointBorderWidth: 1,
        },
      ],
    };
  }, [buckets, latest]);
  const scales = useMemo(
    () => chartScales({ type: "category" }, ceiling),
    [ceiling],
  );
  const tooltip = useMemo(
    () => ({
      title: (items) => `Week starting ${items[0]?.label} (UTC)`,
      label: (item) =>
        `${item.parsed.y} WPM / ${buckets[item.dataIndex].value?.run_count ?? 0} runs`,
    }),
    [buckets],
  );
  const range = ranges.find((entry) => entry.weeks === weeks).label;

  return (
    <section className="profile-improvement" aria-labelledby={`${id}-heading`}>
      <div className="section-heading">
        <h2 id={`${id}-heading`}>Weekly average WPM.</h2>
        <p>Compare one practiced mode at a time.</p>
      </div>
      {trends == null ? (
        <p className="empty-copy">
          Weekly pace data is unavailable for this profile. Reload the page to
          request it again.
        </p>
      ) : modes.length === 0 ? (
        <p className="empty-copy">
          Complete a cloud-saved run to begin your improvement record.
        </p>
      ) : (
        <>
          <div className="improvement-controls">
            <label htmlFor={`${id}-mode`}>
              Practiced mode
              <select
                id={`${id}-mode`}
                value={mode}
                onChange={(event) => setChosenMode(event.target.value)}
              >
                {modes.map((record) => (
                  <option key={record.mode} value={record.mode}>
                    {formatMode(record.mode)}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="segmented"
              role="group"
              aria-label="Improvement range"
            >
              {ranges.map((entry) => (
                <button
                  key={entry.weeks}
                  aria-pressed={weeks === entry.weeks}
                  onClick={() => setWeeks(entry.weeks)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
          <p className="profile-data-note" role="status" aria-live="polite">
            {formatMode(mode)} / {range} / {measured.length} measured{" "}
            {measured.length === 1 ? "week" : "weeks"}. Weeks start Monday at
            00:00 UTC; the current week is included.
          </p>
          {measured.length === 0 ? (
            <p className="empty-copy">
              No cloud runs in this mode during this range. Choose a longer
              range or another practiced mode.
            </p>
          ) : (
            <LineChart
              className="improvement-chart"
              height={272}
              data={data}
              scales={scales}
              tooltip={tooltip}
              label={`${formatMode(mode)} weekly average WPM over ${range}. Black steps and square points show measured weeks. Gaps indicate weeks without runs. Yellow marks the latest measured week. Exact values are in the weekly data table below.`}
            />
          )}
          <details className="improvement-data">
            <summary>View weekly data</summary>
            <div
              className="table-scroll"
              role="region"
              aria-label="Weekly improvement data"
              tabIndex={0}
            >
              <table>
                <caption>
                  {formatMode(mode)} / {range}. Week starts are UTC.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Week starting</th>
                    <th scope="col">Average WPM</th>
                    <th scope="col">Runs</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((bucket) => (
                    <tr key={bucket.week}>
                      <th scope="row">{bucket.week}</th>
                      <td>
                        {bucket.value ? bucket.value.average_wpm : "No runs"}
                      </td>
                      <td>{bucket.value?.run_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
