import * as React from "react";
import { cn } from "../../lib/utils";
import { DropSlot } from "../../lib/dragGhost";
import { AnchoredSurface } from "../../primitives/overlays";

/* BoardRow — one strata row: a 176px rail (drag grip, click-to-rename title,
   count pill that appears on row hover, ⋯ menu with row actions + a
   White/Grey/Dark color row) beside an auto-fit card grid. Ported from the
   org app's overview/BoardRow.tsx — same rail anatomy, same count-aware grid
   tracks, same order-interleaved drop slot — restyled onto this library's
   token set and made fully host-driven (BoardCanvas owns every mechanic;
   this file is presentation + the one imperative bit dnd needs: registering
   DOM nodes for FLIP/hit-testing). */

export type BoardRowTheme = "light" | "tint" | "dark";
export type BoardCardTone = "default" | "accent" | "gray" | "blue" | "green" | "yellow" | "orange" | "red" | "purple" | "pink" | "teal";

export interface BoardCanvasCard {
  id: string;
  title: string;
  /** second line — a description, or a relation summary ("→ 3 readers") */
  subtitle?: string;
  /** small uppercase trailing label, e.g. a kind word ("workflow", "table") */
  kicker?: string;
  tone?: BoardCardTone;
  /** true = subtitle renders in the warn tone (e.g. "→ 0 users") */
  subtitleWarn?: boolean;
}

export interface BoardCanvasRow {
  id: string;
  title: string;
  count?: number | string;
  theme?: BoardRowTheme;
  /** compressed single-line cards vs full two-line cards. Default: full. */
  dense?: boolean;
  collapsed?: boolean;
  emptyLabel?: string;
  /** cards beyond what's rendered — pairs with BoardCanvasProps.onExpandRow */
  hiddenCount?: number;
  cards: BoardCanvasCard[];
}

export interface BoardCardRuntime {
  registerEl: (el: HTMLElement | null) => void;
  onPointerDown: (ev: React.MouseEvent) => void;
  onClick: (() => void) | undefined;
  dragging: boolean;
  justLanded: boolean;
}

export interface BoardRowMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export interface BoardRowRuntime {
  open: boolean;
  hovered: boolean;
  /** this row's grip is the one currently being dragged (cursor: grabbing) */
  rowDragging: boolean;
  menuOpen: boolean;
  editing: boolean;
  editValue: string;
  /** a card is being dragged and this row is a legitimate drop target */
  dropOver: boolean;
  dropIndex: number;
  faint: boolean;
  mounting: boolean;
  menuItems: BoardRowMenuItem[];
  themeItems: { key: BoardRowTheme; selected: boolean; onSelect: () => void }[] | null;
  cardRuntime: (card: BoardCanvasCard) => BoardCardRuntime;
  /** registers the drop slot with the effects layer's liquid group, so the
   *  held card can merge with it. Absent when the effect is off. */
  slotRef?: (el: HTMLElement | null) => void;
  registerRowEl: (el: HTMLDivElement | null) => void;
  onGripDown: (ev: React.MouseEvent) => void;
  onRowMouseEnter: () => void;
  onRowMouseLeave: () => void;
  onTitleClick: () => void;
  onEditChange: (v: string) => void;
  onEditCommit: () => void;
  onEditKeyDown: (ev: React.KeyboardEvent<HTMLInputElement>) => void;
  onMenuToggle: () => void;
  onExpand: (() => void) | undefined;
}

const GripIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="6" cy="4" r="1.15" />
    <circle cx="10" cy="4" r="1.15" />
    <circle cx="6" cy="8" r="1.15" />
    <circle cx="10" cy="8" r="1.15" />
    <circle cx="6" cy="12" r="1.15" />
    <circle cx="10" cy="12" r="1.15" />
  </svg>
);

const MenuDotsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="4" cy="8" r="1.3" />
    <circle cx="8" cy="8" r="1.3" />
    <circle cx="12" cy="8" r="1.3" />
  </svg>
);

function toneStyle(tone: BoardCardTone | undefined): React.CSSProperties {
  if (!tone || tone === "default") return { background: "var(--nx-bg-sunken)", color: "var(--nx-fg-muted)" };
  if (tone === "accent") return { background: "var(--nx-accent-soft)", color: "var(--nx-accent)" };
  return { background: `color-mix(in oklab, var(--nx-opt-${tone}) 16%, var(--nx-bg-raised))`, color: `var(--nx-opt-${tone})` };
}

function BoardCard({ card, dense, order, runtime }: { card: BoardCanvasCard; dense: boolean; order: number; runtime: BoardCardRuntime }) {
  const clickable = !!runtime.onClick;
  return (
    <div
      ref={runtime.registerEl}
      className={cn(
        "nxBdCard",
        dense ? "nxBdCard--dense" : "nxBdCard--full",
        clickable && "nxBdCard--clickable",
        runtime.dragging && "nxBdCard--dragging",
        runtime.justLanded && "nxBdCard--land",
      )}
      style={{ order }}
      data-testid={`board-card-${card.id}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onMouseDown={runtime.onPointerDown}
      onClick={runtime.onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                runtime.onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="nxBdCardTop">
        <span className="nxBdCardTitle">{card.title}</span>
        {card.kicker ? (
          <span className="nxBdCardTone" style={toneStyle(card.tone)}>
            {card.kicker}
          </span>
        ) : card.tone && card.tone !== "default" ? (
          <span className="nxBdCardDot" style={{ background: `var(--nx-opt-${card.tone})` }} />
        ) : null}
      </div>
      {!dense && card.subtitle && <span className={cn("nxBdCardSub", card.subtitleWarn && "nxBdCardSub--warn")}>{card.subtitle}</span>}
    </div>
  );
}

export function BoardRow({ row, runtime }: { row: BoardCanvasRow; runtime: BoardRowRuntime }) {
  const dense = !!row.dense;
  const theme = row.theme ?? "light";
  const hasMoreCell = (row.hiddenCount ?? 0) > 0;
  const trackCount = Math.max(1, Math.min(6, row.cards.length + (runtime.dropOver ? 1 : 0) + (hasMoreCell ? 1 : 0)));

  const menuBtnRef = React.useRef<HTMLButtonElement>(null);

  /* The accordion clips only while it moves: once the expand settles, the
     grid overflows freely again so a hover-grown card is never cropped at
     the row edge (ported from the org source 1:1). */
  const [settled, setSettled] = React.useState(runtime.open);
  React.useEffect(() => {
    if (!runtime.open) setSettled(false);
  }, [runtime.open]);

  return (
    <div
      ref={runtime.registerRowEl}
      className={cn(
        "nxBdRow",
        runtime.open && "nxBdRow--open",
        `nxBdRow--${theme}`,
        runtime.hovered && "nxBdRow--hovered",
        runtime.rowDragging && "nxBdRow--dragTarget nxBdRow--rowDragging",
        runtime.dropOver && "nxBdRow--dropOver",
        runtime.faint && "nxBdRow--faint",
        runtime.mounting && "nxBdRow--mounting",
      )}
      data-testid={`board-row-${row.id}`}
      data-board-row={row.id}
      onMouseEnter={runtime.onRowMouseEnter}
      onMouseLeave={runtime.onRowMouseLeave}
    >
      {/* Rail */}
      <div className="nxBdRail" data-board-menu-keep="1">
        <div className="nxBdRailHead">
          <button
            type="button"
            className="nxBdGrip"
            title="Drag to reorder this board"
            aria-label="Drag to reorder this board"
            onMouseDown={runtime.onGripDown}
          >
            <GripIcon />
          </button>

          {runtime.editing ? (
            <input
              className="nxBdTitleInput"
              value={runtime.editValue}
              onChange={(e) => runtime.onEditChange(e.target.value)}
              onBlur={runtime.onEditCommit}
              onKeyDown={runtime.onEditKeyDown}
              autoFocus
              data-testid={`board-row-title-input-${row.id}`}
            />
          ) : (
            <span
              className="nxBdTitle"
              role="button"
              tabIndex={0}
              title="Rename this board"
              onClick={(e) => {
                e.stopPropagation();
                runtime.onTitleClick();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runtime.onTitleClick();
              }}
              data-testid={`board-row-title-${row.id}`}
            >
              {row.title}
            </span>
          )}

          {!(row.count != null) && (
            <span className={cn("nxBdCount", (runtime.hovered || !runtime.open || runtime.menuOpen) && "nxBdCount--visible")}>{row.count}</span>
          )}

          <div className="nxBdMenuWrap">
            <button
              ref={menuBtnRef}
              type="button"
              className="nxBdMenuBtn"
              title="Board options"
              aria-label="Board options"
              aria-haspopup="menu"
              aria-expanded={runtime.menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                runtime.onMenuToggle();
              }}
            >
              <MenuDotsIcon />
            </button>
            {/* Dismissal stays with BoardCanvas, which owns menuRowId and closes
                on any mousedown outside a [data-board-menu-keep] node — an
                attribute the portaled menu still carries, so that mechanism
                survives the move intact. Letting the engine close as well would
                need a runtime callback this component's public API doesn't have. */}
            <AnchoredSurface
              open={runtime.menuOpen}
              anchor={menuBtnRef}
              side="bottom"
              align="start"
              offset={4}
              closeOnOutsidePointer={false}
              closeOnEscape={false}
              className="nxBdMenu"
              role="menu"
              data-board-menu-keep="1"
              data-testid={`board-row-menu-${row.id}`}
            >
                {runtime.menuItems.map((mi) => (
                  <button
                    type="button"
                    key={mi.key}
                    role="menuitem"
                    className={cn("nxBdMenuItem", mi.danger && "nxBdMenuItem--danger")}
                    onClick={mi.onSelect}
                  >
                    {mi.label}
                  </button>
                ))}
                {runtime.themeItems && (
                  <>
                    <div className="nxBdMenuDivider" />
                    <span className="nxBdMenuLabel">Board color</span>
                    <div className="nxBdSwatchRow">
                      {runtime.themeItems.map((t) => (
                        <button
                          type="button"
                          key={t.key}
                          className={cn("nxBdSwatch", `nxBdSwatch--${t.key}`, t.selected && "nxBdSwatch--selected")}
                          title={t.key}
                          aria-label={`${t.key} board color`}
                          onClick={t.onSelect}
                        />
                      ))}
                    </div>
                  </>
                )}
            </AnchoredSurface>
          </div>
        </div>
      </div>

      {/* Card grid — collapse is an eased 1fr→0fr accordion so the rows below glide */}
      <div
        className={cn("nxBdGridWrap", runtime.open && "nxBdGridWrap--open")}
        onTransitionEnd={(e) => {
          if (e.propertyName === "grid-template-rows" && runtime.open) setSettled(true);
        }}
      >
        <div className={cn("nxBdGridClip", runtime.open && "nxBdGridClip--open", runtime.open && settled && "nxBdGridClip--settled")}>
          <div className="nxBdGrid" style={{ gridTemplateColumns: `repeat(${trackCount}, minmax(0, 1fr))` }}>
            {row.cards.map((card, i) => (
              <BoardCard key={card.id} card={card} dense={dense} order={(i + 1) * 2} runtime={runtime.cardRuntime(card)} />
            ))}
            {runtime.dropOver && (
              <DropSlot
                fxRef={runtime.slotRef}
                size={dense ? "dense" : "full"}
                style={{ order: runtime.dropIndex * 2 + 1 }}
                testId={`board-drop-slot-${row.id}`}
              />
            )}
            {hasMoreCell && (
              <button type="button" className="nxBdMore" style={{ order: 99998 }} onClick={runtime.onExpand} disabled={!runtime.onExpand}>
                {`Expand · ${row.hiddenCount} more`}
              </button>
            )}
            {row.cards.length === 0 && !runtime.dropOver && row.emptyLabel && (
              <div className="nxBdEmpty" style={{ order: 99999 }}>
                {row.emptyLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
