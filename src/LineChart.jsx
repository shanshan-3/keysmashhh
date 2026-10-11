import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
);

export default function LineChart({
  data,
  scales,
  tooltip,
  label,
  height = 230,
  className = "",
}) {
  const canvas = useRef(null);
  const instance = useRef(null);
  const supplied = useRef(null);
  const current = useRef({ data, scales, tooltip });
  current.current = { data, scales, tooltip };

  useEffect(() => {
    const palette = getComputedStyle(document.documentElement);
    const color = (name) => palette.getPropertyValue(name).trim();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const font = { family: '"Space Mono", monospace', size: 12 };
    const chart = new Chart(canvas.current, {
      type: "line",
      data: current.current.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: motion.matches
          ? false
          : { duration: 450, easing: "easeOutQuart" },
        transitions: { resize: { animation: { duration: 0 } } },
        interaction: { mode: "nearest", intersect: false },
        datasets: { line: { clip: false } },
        elements: {
          line: { borderColor: color("--ink"), borderWidth: 3, tension: 0 },
          point: {
            backgroundColor: color("--ink"),
            borderColor: color("--ink"),
            pointStyle: "rect",
            radius: 3,
            hoverRadius: 5,
          },
        },
        plugins: {
          tooltip: {
            backgroundColor: color("--ink"),
            titleColor: color("--paper"),
            bodyColor: color("--paper"),
            cornerRadius: 0,
            titleFont: font,
            bodyFont: font,
            animation: motion.matches ? false : { duration: 100 },
            callbacks: current.current.tooltip,
          },
        },
        scales: current.current.scales,
      },
    });
    instance.current = chart;
    supplied.current = JSON.stringify({
      data: current.current.data,
      scales: current.current.scales,
    });
    function preferenceChanged() {
      chart.stop();
      chart.options.animation = motion.matches
        ? false
        : { duration: 250, easing: "easeOutQuart" };
      chart.options.plugins.tooltip.animation = motion.matches
        ? false
        : { duration: 100 };
      chart.update("none");
    }
    motion.addEventListener("change", preferenceChanged);
    let active = true;
    let fontRefresh;
    if (document.fonts.status !== "loaded") {
      document.fonts.ready.then(() => {
        if (active)
          fontRefresh = setTimeout(
            () => {
              if (active) chart.update("none");
            },
            motion.matches ? 0 : 450,
          );
      });
    }
    return () => {
      active = false;
      clearTimeout(fontRefresh);
      motion.removeEventListener("change", preferenceChanged);
      chart.destroy();
      instance.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instance.current;
    if (!chart) return;
    chart.options.plugins.tooltip.callbacks = tooltip;
    const signature = JSON.stringify({ data, scales });
    // Parent renders may rebuild equivalent data; only changed measurements animate.
    if (supplied.current === signature) return;
    supplied.current = signature;
    chart.data = data;
    chart.options.scales = scales;
    chart.options.animation = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? false
      : { duration: 250, easing: "easeOutQuart" };
    chart.update();
  }, [data, scales, tooltip]);

  return (
    <div className={`line-chart ${className}`} style={{ height }}>
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}

export function chartScales(x, max) {
  const palette = getComputedStyle(document.documentElement);
  const muted = palette.getPropertyValue("--muted").trim();
  const rule = palette.getPropertyValue("--rule").trim();
  const font = { family: '"Space Mono", monospace', size: 12 };
  return {
    x: {
      ...x,
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: muted,
        font,
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 5,
        ...x.ticks,
      },
    },
    y: {
      min: 0,
      max,
      border: { display: false },
      grid: { color: rule },
      ticks: { color: muted, font, maxTicksLimit: 5 },
      title: { display: true, text: "WPM", color: muted, font },
    },
  };
}
