import { useEffect, useState } from "react";
// A component that hands each card of its props to a runtime call: the world may write the card it is handed
// (exec/fake.mjs writeHanded), and that write must read the same in both of the purity check's renders. Row is pure.
export interface Card { id: string; title: string; kicker?: string; tone?: string }
export interface CardRuntime { dragging: boolean }
export interface RowRuntime { open: boolean; cardRuntime: (card: Card) => CardRuntime }
export function Row({ cards, runtime }: { cards: Card[]; runtime: RowRuntime }) {
  const [settled, setSettled] = useState(runtime.open);
  useEffect(() => {
    if (!runtime.open) setSettled(false);
  }, []);
  return (
    <ul className={settled ? "settled" : "moving"}>
      {cards.map((card) => (
        <li key={card.id} className={runtime.cardRuntime(card).dragging ? "drag" : "rest"}>
          {card.title} {card.kicker} {card.tone}
        </li>
      ))}
    </ul>
  );
}
export function Cards({ cards, runtime }: { cards: Card[]; runtime: RowRuntime }) {
  return (
    <ol>
      {cards.map((card) => (
        <li key={card.id} className={runtime.cardRuntime(card).dragging ? "drag" : "rest"}>
          {card.title} {card.kicker}
        </li>
      ))}
    </ol>
  );
}
export function Marked({ card, runtime }: { card: Card; runtime: RowRuntime }) {
  const rt = runtime.cardRuntime(card);
  card.title = card.title + "!"; // the component's own write to its props, after the world's: an impure render, whatever the world wrote
  return <p className={rt.dragging ? "drag" : "rest"}>{card.title}</p>;
}
