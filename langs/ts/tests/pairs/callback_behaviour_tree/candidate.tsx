import { Table } from 'ui';
export interface Row { name: string; size: number; }
export interface Props { rows: Row[]; }
// a function the tree holds and lane B never fires (not `on[A-Z]`), with statements the descriptor reader stops at, rewritten
export function List(props: Props) { return <Table rows={props.rows} render={(row: Row) => { const label = row.name; if (!label) return '-'; return label.toUpperCase(); }} />; }
// the same held function, its behaviour changed
export function ListDiffers(props: Props) { return <Table rows={props.rows} render={(it: Row) => { const n = it.name; if (n) { return n.toLowerCase(); } return '-'; }} />; }
