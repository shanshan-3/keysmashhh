import { useEffect, useMemo, useRef, useState } from "react";
import { isCustomMode } from "./history.js";
import {
  loadRunPage,
  loadRunOverview,
  loadRunDetails,
  RUN_PAGE_SIZE,
} from "./cloudHistory.js";

const empty = {
  pages: [],
  page: 0,
  selectedId: null,
  loading: false,
  pageError: "",
  pendingPage: 0,
  pendingEdge: "first",
  overview: [],
  overviewLoading: false,
  overviewError: "",
};

export default function useRunHistory({
  source,
  userId,
  mode,
  freshRun,
  localRuns,
}) {
  const key = JSON.stringify([source, userId, mode, freshRun]);
  const session = useRef(null);
  const [state, setState] = useState({ ...empty, key });
  const [detail, setDetail] = useState(null);
  const [detailRetry, setDetailRetry] = useState(0);
  const localFiltered = useMemo(
    () => localRuns.filter((run) => mode === "all" || run.mode === mode),
    [localRuns, mode],
  );
  const cloud = source === "cloud";
  const current =
    state.key === key
      ? state
      : {
          ...empty,
          loading: cloud && !!userId,
          overviewLoading: cloud && !!userId,
        };

  function update(context, change) {
    if (!context?.active || session.current !== context) return;
    setState((previous) =>
      previous.key === context.key ? change(previous) : previous,
    );
  }

  async function pageTo(index, edge = "first", context = session.current) {
    if (
      !context?.active ||
      context.key !== key ||
      index < 0 ||
      context.pagePending
    )
      return;
    if (!cloud) {
      const rows = localFiltered.slice(
        index * RUN_PAGE_SIZE,
        (index + 1) * RUN_PAGE_SIZE,
      );
      if (rows.length)
        update(context, (previous) => ({
          ...previous,
          page: index,
          selectedId: (edge === "last" ? rows.at(-1) : rows[0]).id,
        }));
      return;
    }
    const cached = context.pages[index];
    if (cached) {
      update(context, (previous) => ({
        ...previous,
        page: index,
        pageError: "",
        selectedId:
          (edge === "last" ? cached.rows.at(-1) : cached.rows[0])?.id ?? null,
      }));
      return;
    }
    const before = context.pages[index - 1];
    if (index > 0 && !before?.hasMore) return;
    context.pagePending = true;
    update(context, (previous) => ({
      ...previous,
      loading: true,
      pageError: "",
      pendingPage: index,
      pendingEdge: edge,
    }));
    try {
      const page = await loadRunPage(
        userId,
        mode,
        before?.rows.at(-1),
        context.controller.signal,
      );
      if (!context.active) return;
      if (index > 0 && !page.rows.length) {
        context.pages[index - 1] = { ...before, hasMore: false };
        update(context, (previous) => ({
          ...previous,
          pages: [...context.pages],
          loading: false,
        }));
        return;
      }
      context.pages[index] = page;
      update(context, (previous) => ({
        ...previous,
        pages: [...context.pages],
        page: page.rows.length || index === 0 ? index : previous.page,
        loading: false,
        selectedId: page.rows.length
          ? (edge === "last" ? page.rows.at(-1) : page.rows[0]).id
          : previous.selectedId,
      }));
    } catch {
      if (!context.controller.signal.aborted)
        update(context, (previous) => ({
          ...previous,
          loading: false,
          pageError:
            "Cloud runs could not load. Retry this page or view your device history.",
        }));
    } finally {
      context.pagePending = false;
    }
  }

  async function overview(context = session.current) {
    if (!context?.active || context.key !== key || !cloud || !userId) return;
    update(context, (previous) => ({
      ...previous,
      overviewLoading: true,
      overviewError: "",
    }));
    try {
      const rows = await loadRunOverview(
        userId,
        mode,
        context.controller.signal,
      );
      update(context, (previous) => ({
        ...previous,
        overview: rows,
        overviewLoading: false,
      }));
    } catch {
      if (!context.controller.signal.aborted)
        update(context, (previous) => ({
          ...previous,
          overviewLoading: false,
          overviewError:
            "Recent-run trends could not load. Your run browser is still available.",
        }));
    }
  }

  useEffect(() => {
    const context = {
      key,
      active: true,
      controller: new AbortController(),
      pages: [],
      details: new Map(),
      pagePending: false,
    };
    session.current = context;
    setState({
      ...empty,
      key,
      selectedId: cloud ? null : (localFiltered[0]?.id ?? null),
    });
    setDetail(null);
    if (cloud && userId) {
      pageTo(0, "first", context);
      overview(context);
    }
    return () => {
      context.active = false;
      context.controller.abort();
      context.details.clear();
    };
  }, [key]);

  const rows = cloud
    ? current.pages[current.page]?.rows || []
    : localFiltered.slice(
        current.page * RUN_PAGE_SIZE,
        (current.page + 1) * RUN_PAGE_SIZE,
      );
  const selected = rows.find((row) => row.id === current.selectedId) || rows[0];
  const hasMore = cloud
    ? !!current.pages[current.page]?.hasMore
    : (current.page + 1) * RUN_PAGE_SIZE < localFiltered.length;
  const selectedId = selected?.id;

  useEffect(() => {
    if (!cloud || !userId || selectedId == null) return;
    const context = session.current;
    if (context?.key !== key) return;
    const cached = context.details.get(selectedId);
    if (cached) {
      setDetail({ key, id: selectedId, run: cached });
      return;
    }
    const controller = new AbortController();
    setDetail({ key, id: selectedId, loading: true });
    loadRunDetails(
      userId,
      selectedId,
      AbortSignal.any([controller.signal, context.controller.signal]),
    ).then(
      (run) => {
        if (controller.signal.aborted || !context.active) return;
        context.details.set(selectedId, run);
        setDetail({ key, id: selectedId, run });
      },
      () => {
        if (!controller.signal.aborted && context.active)
          setDetail({
            key,
            id: selectedId,
            error:
              "Chart data could not load for this run. Its saved scores are still shown.",
          });
      },
    );
    return () => controller.abort();
  }, [key, selectedId, detailRetry, cloud, userId]);

  const activeDetail =
    detail?.key === key && detail.id === selectedId ? detail : null;
  return {
    rows,
    selected,
    page: current.page,
    hasMore,
    loading: current.loading,
    pageError: current.pageError,
    retryPage: () => pageTo(current.pendingPage, current.pendingEdge),
    pageTo,
    select: (id) =>
      update(session.current, (previous) => ({ ...previous, selectedId: id })),
    overview: cloud
      ? current.overview
      : localFiltered.filter((run) => !isCustomMode(run.mode)).slice(0, 30),
    overviewLoading: current.overviewLoading,
    overviewError: current.overviewError,
    retryOverview: () => overview(),
    details: cloud ? activeDetail?.run : selected,
    detailLoading:
      cloud && !!selected && (!activeDetail || activeDetail.loading),
    detailError: activeDetail?.error,
    retryDetails: () => setDetailRetry((value) => value + 1),
    modes: [
      ...new Set(
        current.pages
          .flatMap((page) => page.rows.map((run) => run.mode))
          .concat(current.overview.map((run) => run.mode)),
      ),
    ],
  };
}
