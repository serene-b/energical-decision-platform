import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, MapPinned, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";

import { formatNumber } from "../../utils/formatters.js";
import {
  emptyHoverOwnership,
  hoverIsOwned,
  ownCard,
  ownRegion,
  releaseHover,
} from "../../utils/mapInteraction.js";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const HOVER_INTENT_MS = 220;
const CARD_EXIT_MS = 360;
const CARD_TRANSITION_MS = 190;

const labels = {
  en: {
    exploration: "Geographic exploration",
    select: "Select a wilaya",
    boundaries: "58 geographic boundaries",
    fixtures: "Processed aggregate metrics",
    loading: "Loading the geographic boundary map…",
    loadError: "The geographic map could not be loaded.",
    overview: "Regional business overview",
    synthetic: "Processed aggregate",
    boundaryOnly: "Geographic boundary · metrics not connected",
    revenue: "Revenue",
    clients: "Clients",
    orders: "Orders",
    growth: "Growth",
    share: "Market share",
    explore: "Explore wilaya",
    askAi: "Ask AI",
    all: "Algeria",
    selected: "Selected",
    available: "Aggregate metric available",
    source: "Boundary source: SimpleMaps · CC BY 4.0",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetView: "Reset map view",
    mapNavigation: "Map navigation",
  },
  fr: {
    exploration: "Exploration géographique",
    select: "Sélectionnez une wilaya",
    boundaries: "58 limites géographiques",
    fixtures: "Métriques agrégées traitées",
    loading: "Chargement de la carte géographique…",
    loadError: "La carte géographique n’a pas pu être chargée.",
    overview: "Vue d’ensemble régionale",
    synthetic: "Agrégat traité",
    boundaryOnly: "Limite géographique · métriques non connectées",
    revenue: "Revenu",
    clients: "Clients",
    orders: "Commandes",
    growth: "Croissance",
    share: "Part de marché",
    explore: "Explorer la wilaya",
    askAi: "Demander à l’IA",
    all: "Algérie",
    selected: "Sélectionnée",
    available: "Métrique agrégée disponible",
    source: "Source des limites : SimpleMaps · CC BY 4.0",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    resetView: "Réinitialiser la vue",
    mapNavigation: "Navigation de la carte",
  },
};

function approvedMetrics(wilaya) {
  if (!wilaya) return {};

  return {
    revenue_m_da: wilaya.revenue,
    clients: wilaya.clients,
    orders: wilaya.orders,
    growth_pct: wilaya.growth,
    share_pct: wilaya.share,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function AlgeriaMap({
  wilayas,
  selectedWilayaId,
  selectedWilayaName,
  onSelect,
  onResetSelection,
  onAskAI,
  language = "en",
}) {
  const text = labels[language] || labels.en;
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const hoverIntentTimerRef = useRef(null);
  const cardRemovalTimerRef = useRef(null);
  const cardUnmountTimerRef = useRef(null);
  const pendingCardRef = useRef(null);
  const hoveredRef = useRef(null);
  const hoverRegionRef = useRef(emptyHoverOwnership());
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [cardVisible, setCardVisible] = useState(false);
  const [viewport, setViewport] = useState({ zoom: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  const metricLookup = useMemo(
    () => new Map(wilayas.map((wilaya) => [wilaya.id, wilaya])),
    [wilayas],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetch("/maps/algeria-wilayas.svg", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Map request failed: ${response.status}`);
        return response.text();
      })
      .then((markup) => {
        setSvgMarkup(markup.replace(/viewbox=/i, "viewBox="));
        setLoadError(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(true);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!svgMarkup || !svgRef.current) return;

    svgRef.current.querySelectorAll("#features path[id^='DZ']").forEach((path) => {
      const code = path.id.slice(2);
      const name = path.getAttribute("name") || `Wilaya ${code}`;
      const metrics = metricLookup.get(code);
      const intensity = metrics ? Math.min(38 + metrics.share * 2.25, 88) : 0;

      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute(
        "aria-label",
        metrics
          ? `${name}, ${metrics.revenue}M DZD, ${formatNumber(metrics.clients, language)} ${text.clients.toLowerCase()}`
          : `${name}, ${text.boundaryOnly}`,
      );
      path.classList.toggle("has-metrics", Boolean(metrics));
      path.classList.toggle("is-selected", selectedWilayaId === code);
      path.style.setProperty("--region-intensity", `${intensity}%`);
    });
  }, [language, metricLookup, selectedWilayaId, svgMarkup, text.boundaryOnly, text.clients]);

  useEffect(() => () => {
    window.clearTimeout(hoverIntentTimerRef.current);
    window.clearTimeout(cardRemovalTimerRef.current);
    window.clearTimeout(cardUnmountTimerRef.current);
  }, []);

  const getRegion = (target) => target?.closest?.("#features path[id^='DZ']");

  const setHoverHighlight = (regionId) => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.querySelectorAll("#features path[id^='DZ'].is-hovered").forEach((path) => {
      if (path.id !== `DZ${regionId}`) path.classList.remove("is-hovered");
    });
    const region = svg.querySelector(`#features path[id="DZ${regionId}"]`);
    region?.classList.add("is-hovered");
    svg.classList.add("has-active-region");
  };

  const clearHoverHighlight = (regionId = null) => {
    const svg = svgRef.current;
    if (!svg) return;
    if (regionId) {
      svg.querySelector(`#features path[id="DZ${regionId}"]`)?.classList.remove("is-hovered");
    } else {
      svg.querySelectorAll("#features path[id^='DZ'].is-hovered").forEach((path) => path.classList.remove("is-hovered"));
    }
    if (!svg.querySelector("#features path[id^='DZ'].is-hovered")) {
      svg.classList.remove("has-active-region");
    }
  };

  const cancelHide = () => {
    window.clearTimeout(cardRemovalTimerRef.current);
    window.clearTimeout(cardUnmountTimerRef.current);
  };

  const dismissHover = () => {
    window.clearTimeout(hoverIntentTimerRef.current);
    cancelHide();
    pendingCardRef.current = null;
    hoverRegionRef.current = emptyHoverOwnership();
    clearHoverHighlight();
    setCardVisible(false);
    setHovered(null);
  };

  const clampViewport = (x, y, zoom) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds || zoom <= 1) return { x: 0, y: 0 };

    const maxX = (zoom - 1) * bounds.width * 0.46;
    const maxY = (zoom - 1) * bounds.height * 0.46;
    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
  };

  const changeZoom = (nextZoomValue, origin = null) => {
    setViewport((current) => {
      const nextZoom = clamp(nextZoomValue, MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === current.zoom) return current;

      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) return { zoom: nextZoom, x: current.x, y: current.y };

      const originX = origin ? origin.x - bounds.left - bounds.width / 2 : 0;
      const originY = origin ? origin.y - bounds.top - bounds.height / 2 : 0;
      const ratio = nextZoom / current.zoom;
      const nextX = current.x + (1 - ratio) * (originX - current.x);
      const nextY = current.y + (1 - ratio) * (originY - current.y);
      const clamped = clampViewport(nextX, nextY, nextZoom);

      return { zoom: nextZoom, ...clamped };
    });
  };

  const resetView = () => {
    setViewport({ zoom: 1, x: 0, y: 0 });
    setIsPanning(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const handleNativeWheel = (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.00115);
      const bounds = canvas.getBoundingClientRect();

      window.clearTimeout(hoverIntentTimerRef.current);
      pendingCardRef.current = null;
      hoverRegionRef.current = emptyHoverOwnership();
      clearHoverHighlight();
      setCardVisible(false);
      window.clearTimeout(cardRemovalTimerRef.current);
      window.clearTimeout(cardUnmountTimerRef.current);
      cardUnmountTimerRef.current = window.setTimeout(() => setHovered(null), CARD_TRANSITION_MS);

      setViewport((current) => {
        const nextZoom = clamp(current.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        if (nextZoom === current.zoom) return current;

        const originX = event.clientX - bounds.left - bounds.width / 2;
        const originY = event.clientY - bounds.top - bounds.height / 2;
        const ratio = nextZoom / current.zoom;
        const proposedX = current.x + (1 - ratio) * (originX - current.x);
        const proposedY = current.y + (1 - ratio) * (originY - current.y);
        const maxX = (nextZoom - 1) * bounds.width * 0.46;
        const maxY = (nextZoom - 1) * bounds.height * 0.46;

        return {
          zoom: nextZoom,
          x: nextZoom <= 1 ? 0 : clamp(proposedX, -maxX, maxX),
          y: nextZoom <= 1 ? 0 : clamp(proposedY, -maxY, maxY),
        };
      });
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleNativeWheel);
  }, []);

  const cardDataFor = (event, region) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (!canvasBounds) return null;

    const code = region.id.slice(2);
    const metrics = metricLookup.get(code) || null;
    const cardWidth = Math.min(320, Math.max(250, canvasBounds.width - 28));
    const cardHeight = metrics ? 342 : 228;
    const localX = event.clientX - canvasBounds.left;
    const localY = event.clientY - canvasBounds.top;
    const preferredX = localX + cardWidth + 32 <= canvasBounds.width
      ? localX + 18
      : localX - cardWidth - 18;
    const preferredY = localY - 38;

    return {
      id: code,
      name: region.getAttribute("name") || `Wilaya ${code}`,
      metrics,
      x: clamp(preferredX, 14, Math.max(14, canvasBounds.width - cardWidth - 14)),
      y: clamp(preferredY, 14, Math.max(14, canvasBounds.height - cardHeight - 14)),
    };
  };

  const showCardWithIntent = (event, region, delay = HOVER_INTENT_MS) => {
    const nextCard = cardDataFor(event, region);
    if (!nextCard) return;

    cancelHide();
    pendingCardRef.current = nextCard;
    hoverRegionRef.current = ownRegion(nextCard.id);
    setHoverHighlight(nextCard.id);

    if (hoveredRef.current?.id === nextCard.id) {
      setHovered(nextCard);
      setCardVisible(true);
      return;
    }

    setCardVisible(false);
    window.clearTimeout(hoverIntentTimerRef.current);
    hoverIntentTimerRef.current = window.setTimeout(() => {
      const pending = pendingCardRef.current;
      if (!pending || hoverRegionRef.current.id !== pending.id) return;
      hoveredRef.current = pending;
      setHovered(pending);
      window.requestAnimationFrame(() => {
        if (hoverRegionRef.current.id === pending.id) setCardVisible(true);
      });
    }, delay);
  };

  const updateCardPosition = (event, region) => {
    const nextCard = cardDataFor(event, region);
    if (!nextCard) return;

    pendingCardRef.current = nextCard;
    if (hoveredRef.current?.id === nextCard.id) setHovered(nextCard);
  };

  const scheduleHide = (delay = CARD_EXIT_MS) => {
    window.clearTimeout(hoverIntentTimerRef.current);
    cancelHide();
    cardRemovalTimerRef.current = window.setTimeout(() => {
      const interaction = hoverRegionRef.current;
      if (hoverIsOwned(interaction)) return;

      pendingCardRef.current = null;
      clearHoverHighlight(interaction.id);
      setCardVisible(false);
      cardUnmountTimerRef.current = window.setTimeout(() => {
        if (!hoverRegionRef.current.overRegion && !hoverRegionRef.current.overCard) {
          hoveredRef.current = null;
          setHovered(null);
          hoverRegionRef.current = emptyHoverOwnership();
        }
      }, CARD_TRANSITION_MS);
    }, delay);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 || event.target.closest?.("button, a, .wilaya-hover-card")) return;

    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      totalDistance: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.totalDistance += Math.abs(deltaX) + Math.abs(deltaY);

      if (drag.totalDistance > 4) {
        setIsPanning(true);
        dismissHover();
        setViewport((current) => {
          const clamped = clampViewport(current.x + deltaX, current.y + deltaY, current.zoom);
          return { ...current, ...clamped };
        });
      }
      return;
    }

    const region = getRegion(event.target);
    if (region) updateCardPosition(event, region);
  };

  const finishPan = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    suppressClickRef.current = drag.totalDistance > 4;
    dragRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handlePointerOver = (event) => {
    if (dragRef.current) return;
    const region = getRegion(event.target);
    if (!region) return;

    showCardWithIntent(event, region);
  };

  const handlePointerOut = (event) => {
    const region = getRegion(event.target);
    if (!region) return;

    const regionId = region.id.slice(2);
    const nextRegion = getRegion(event.relatedTarget);
    if (nextRegion?.id === region.id) return;

    const movingToCard = event.relatedTarget?.closest?.(".wilaya-hover-card")
      && hoveredRef.current?.id === regionId;
    hoverRegionRef.current = movingToCard ? ownCard(regionId) : releaseHover(regionId);
    if (movingToCard) {
      cancelHide();
      setHoverHighlight(regionId);
      return;
    }
    scheduleHide();
  };

  const handleFocus = (event) => {
    const region = getRegion(event.target);
    if (!region) return;

    const bounds = region.getBoundingClientRect();
    showCardWithIntent(
      { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 },
      region,
      100,
    );
    hoverRegionRef.current = ownRegion(region.id.slice(2));
    setHoverHighlight(region.id.slice(2));
  };

  const handleBlur = (event) => {
    const region = getRegion(event.target);
    if (!region || event.relatedTarget?.closest?.(".wilaya-hover-card")) return;

    hoverRegionRef.current = releaseHover(region.id.slice(2));
    scheduleHide();
  };

  const selectRegion = (region) => {
    const code = region.id.slice(2);
    const name = region.getAttribute("name") || `Wilaya ${code}`;
    dismissHover();
    onSelect(code, name);
  };

  const handleClick = (event) => {
    if (suppressClickRef.current) return;
    const region = getRegion(event.target);
    if (region) selectRegion(region);
  };

  const handleKeyDown = (event) => {
    const region = getRegion(event.target);
    if (region && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      selectRegion(region);
    }
  };

  const handleAskAI = (region = hovered) => {
    if (!region) return;

    onAskAI?.({
      page: "wilayas",
      selection_type: "wilaya",
      selection: region.name,
      approved_metrics: approvedMetrics(region.metrics),
    });
  };

  return (
    <div className="algeria-map-shell">
      <div className="algeria-map-toolbar">
        <div className="map-toolbar-copy">
          <span className="map-toolbar-kicker">
            <MapPinned size={14} strokeWidth={1.8} aria-hidden="true" />
            {text.exploration}
          </span>
          <strong>{text.select}</strong>
          <nav className="map-breadcrumb" aria-label={text.mapNavigation}>
            <button type="button" onClick={onResetSelection}>{text.all}</button>
            {selectedWilayaName && <><span aria-hidden="true">/</span><strong>{selectedWilayaName}</strong></>}
          </nav>
        </div>
        <div className="map-toolbar-counts">
          <span>{text.boundaries}</span>
          <span>{text.fixtures}</span>
        </div>
      </div>

      <div
        className={`algeria-map-canvas ${isPanning ? "is-panning" : ""} ${viewport.zoom > 1 ? "is-zoomed" : ""}`}
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPan}
        onPointerCancel={finishPan}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="map-navigation-controls" role="group" aria-label={text.mapNavigation}>
          <button type="button" onClick={() => changeZoom(viewport.zoom + 0.45)} disabled={viewport.zoom >= MAX_ZOOM} aria-label={text.zoomIn} title={text.zoomIn}>
            <Plus size={17} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => changeZoom(viewport.zoom - 0.45)} disabled={viewport.zoom <= MIN_ZOOM} aria-label={text.zoomOut} title={text.zoomOut}>
            <Minus size={17} aria-hidden="true" />
          </button>
          <button type="button" className="map-reset-control" onClick={resetView} disabled={viewport.zoom === 1 && viewport.x === 0 && viewport.y === 0} aria-label={text.resetView} title={text.resetView}>
            <RotateCcw size={15} aria-hidden="true" />
          </button>
          <span aria-live="polite">{Math.round(viewport.zoom * 100)}%</span>
        </div>

        {!svgMarkup && !loadError && <div className="algeria-map-state">{text.loading}</div>}
        {loadError && <div className="algeria-map-state is-error">{text.loadError}</div>}
        {svgMarkup && (
          <div
            ref={svgRef}
            className="algeria-map-svg"
            role="group"
            aria-label={language === "fr" ? "Carte interactive des 58 wilayas d’Algérie" : "Interactive map of Algeria's 58 wilayas"}
            style={{ transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})` }}
            // This is a bundled, reviewed SVG asset rather than user-provided content.
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        )}

        {hovered && (
          <article
            className={`wilaya-hover-card ${cardVisible ? "is-visible" : ""} ${selectedWilayaId === hovered.id ? "is-selected-context" : ""}`}
            style={{ left: hovered.x, top: hovered.y }}
            onPointerEnter={() => {
              cancelHide();
              hoverRegionRef.current = ownCard(hovered.id);
              setHoverHighlight(hovered.id);
              setCardVisible(true);
            }}
            onPointerLeave={(event) => {
              const nextRegion = getRegion(event.relatedTarget);
              const returningToRegion = nextRegion?.id === `DZ${hovered.id}`;
              hoverRegionRef.current = returningToRegion
                ? ownRegion(hovered.id)
                : releaseHover(hovered.id);
              if (returningToRegion) {
                cancelHide();
                setHoverHighlight(hovered.id);
                return;
              }
              scheduleHide();
            }}
            onFocusCapture={() => {
              cancelHide();
              hoverRegionRef.current = ownCard(hovered.id);
              setHoverHighlight(hovered.id);
              setCardVisible(true);
            }}
            onBlurCapture={(event) => {
              if (event.currentTarget.contains(event.relatedTarget)) return;
              const nextRegion = getRegion(event.relatedTarget);
              const returningToRegion = nextRegion?.id === `DZ${hovered.id}`;
              hoverRegionRef.current = returningToRegion
                ? ownRegion(hovered.id)
                : releaseHover(hovered.id);
              if (returningToRegion) return;
              scheduleHide();
            }}
            aria-live="polite"
          >
            <div className="wilaya-hover-card-heading">
              <div>
                <h4>{hovered.name}</h4>
                <span>{text.overview}</span>
              </div>
              <span className={`wilaya-fixture-status ${hovered.metrics ? "is-available" : ""}`}>
                {selectedWilayaId === hovered.id ? text.selected : hovered.metrics ? text.synthetic : text.boundaryOnly}
              </span>
            </div>

            {hovered.metrics ? (
              <dl className="wilaya-hover-metrics">
                <div className="is-primary"><dt>{text.revenue}</dt><dd>{hovered.metrics.revenue}M DZD</dd></div>
                <div><dt>{text.clients}</dt><dd>{formatNumber(hovered.metrics.clients, language)}</dd></div>
                <div><dt>{text.orders}</dt><dd>{formatNumber(hovered.metrics.orders, language)}</dd></div>
                <div><dt>{text.growth}</dt><dd>{hovered.metrics.growth >= 0 ? "+" : ""}{hovered.metrics.growth}%</dd></div>
                <div><dt>{text.share}</dt><dd>{hovered.metrics.share}%</dd></div>
              </dl>
            ) : (
              <p className="wilaya-hover-empty">{text.boundaryOnly}</p>
            )}

            <div className="wilaya-hover-actions">
              <button type="button" onClick={() => onSelect(hovered.id, hovered.name)}>
                {text.explore}<ArrowUpRight size={14} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => handleAskAI()}>
                <Sparkles size={14} aria-hidden="true" />{text.askAi}
              </button>
            </div>
          </article>
        )}
      </div>

      <div className="algeria-map-legend">
        <span><i className="map-legend-swatch map-legend-swatch--low" /> {text.available}</span>
        <span><i className="map-legend-swatch map-legend-swatch--selected" /> {text.selected}</span>
        <span>{selectedWilayaName || text.all}</span>
      </div>
      <a className="algeria-map-source" href="https://simplemaps.com/gis/country/dz" target="_blank" rel="noreferrer">
        {text.source}
      </a>
    </div>
  );
}

export default AlgeriaMap;
