const SVG_NS = "http://www.w3.org/2000/svg";
const TRAIL_MS = 800;

export const GRID_CELL = 32;

type Square = {
  x: number;
  y: number;
  timestamp: number;
  isCenter: boolean;
  opacity: number;
  scale: number;
};

export function surroundingCells(
  cx: number,
  cy: number,
  count = 4,
  radius = 1,
): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  const used = new Set([`${cx}-${cy}`]);
  const span = radius * 2 + 1;
  let attempts = 0;
  while (cells.length < count && attempts < count * 3) {
    attempts += 1;
    const x = cx + Math.floor(Math.random() * span) - radius;
    const y = cy + Math.floor(Math.random() * span) - radius;
    const key = `${x}-${y}`;
    if (!used.has(key)) {
      used.add(key);
      cells.push({ x, y });
    }
  }
  return cells;
}

export function mountGridPattern(slot: HTMLElement) {
  const svg = slot.querySelector("svg");
  const group = svg?.querySelector<SVGGElement>("[data-grid-highlights]");
  if (!svg || !group) {
    return () => undefined;
  }

  const pool: SVGRectElement[] = [];
  const trail: Square[] = [];
  let current: { x: number; y: number } | null = null;
  let surrounding: Array<{ x: number; y: number }> = [];
  let moving = false;
  let leaveTimer = 0;
  let raf = 0;
  let scrollRaf = 0;
  let lastPointer: { x: number; y: number } | null = null;
  const primary =
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() ||
    "oklch(0.6716 0.1368 48.513)";

  const rectAt = (index: number) => {
    const existing = pool[index];
    if (existing) {
      existing.removeAttribute("display");
      return existing;
    }
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("fill", "none");
    group.appendChild(rect);
    pool[index] = rect;
    return rect;
  };

  const tick = () => {
    raf = 0;
    const now = Date.now();
    const live = trail.filter((square) => now - square.timestamp < TRAIL_MS);
    trail.length = 0;
    trail.push(...live);

    const render: Square[] = [...live];
    if (current && moving) {
      render.push({
        x: current.x,
        y: current.y,
        timestamp: now,
        isCenter: true,
        opacity: 1,
        scale: 1,
      });
      for (const cell of surrounding) {
        render.push({
          x: cell.x,
          y: cell.y,
          timestamp: now,
          isCenter: false,
          opacity: 0.7,
          scale: 0.9,
        });
      }
    }

    render.forEach((square, index) => {
      const age = (now - square.timestamp) / TRAIL_MS;
      const rect = rectAt(index);
      rect.setAttribute("x", String(square.x * GRID_CELL + 0.5));
      rect.setAttribute("y", String(square.y * GRID_CELL + 0.5));
      rect.setAttribute("width", String(GRID_CELL - 1));
      rect.setAttribute("height", String(GRID_CELL - 1));
      rect.setAttribute("stroke", primary);
      rect.setAttribute("stroke-width", square.isCenter ? "2" : "1.5");
      rect.setAttribute("opacity", String(square.opacity * (1 - age)));
      rect.style.transform = `scale(${square.scale})`;
      rect.style.transformOrigin = `${square.x * GRID_CELL + GRID_CELL / 2}px ${square.y * GRID_CELL + GRID_CELL / 2}px`;
    });

    for (let index = render.length; index < pool.length; index += 1) {
      pool[index]?.setAttribute("display", "none");
    }

    if (render.length > 0) {
      raf = requestAnimationFrame(tick);
    }
  };

  const schedule = () => {
    if (raf === 0) {
      raf = requestAnimationFrame(tick);
    }
  };

  const clearHover = () => {
    current = null;
    surrounding = [];
    moving = false;
    schedule();
  };

  const applyPointer = (clientX: number, clientY: number, target: EventTarget | null) => {
    if ((target as Element | null)?.closest?.(".grid-interaction-blocked")) {
      clearHover();
      return;
    }

    const bounds = svg.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) {
      clearHover();
      return;
    }

    const gridX = Math.floor(x / GRID_CELL);
    const gridY = Math.floor(y / GRID_CELL);
    moving = true;
    window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(() => {
      moving = false;
      current = null;
      surrounding = [];
      schedule();
    }, 100);

    if (!current || current.x !== gridX || current.y !== gridY) {
      if (current) {
        const timestamp = Date.now();
        trail.push({
          x: current.x,
          y: current.y,
          timestamp,
          isCenter: true,
          opacity: 0.8,
          scale: 0.8,
        });
        for (const cell of surrounding) {
          trail.push({
            x: cell.x,
            y: cell.y,
            timestamp,
            isCenter: false,
            opacity: 0.6,
            scale: 0.8,
          });
        }
      }
      current = { x: gridX, y: gridY };
      surrounding = surroundingCells(gridX, gridY);
    }

    schedule();
  };

  const onMove = (event: PointerEvent) => {
    lastPointer = { x: event.clientX, y: event.clientY };
    applyPointer(event.clientX, event.clientY, event.target);
  };

  const onScroll = () => {
    if (!lastPointer || scrollRaf !== 0) {
      return;
    }
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      if (!lastPointer) {
        return;
      }
      applyPointer(
        lastPointer.x,
        lastPointer.y,
        document.elementFromPoint(lastPointer.x, lastPointer.y),
      );
    });
  };

  let listening = false;
  const attach = () => {
    if (listening) {
      return;
    }
    listening = true;
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
  };

  const detach = () => {
    if (!listening) {
      return;
    }
    listening = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("scroll", onScroll);
    lastPointer = null;
    window.clearTimeout(leaveTimer);
    if (scrollRaf !== 0) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
    }
    clearHover();
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        attach();
      } else {
        detach();
      }
    },
    { threshold: 0 },
  );

  observer.observe(svg);

  return () => {
    observer.disconnect();
    detach();
    window.clearTimeout(leaveTimer);
    if (raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    for (const rect of pool) {
      rect.remove();
    }
    pool.length = 0;
    trail.length = 0;
  };
}
