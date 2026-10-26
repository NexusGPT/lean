// Moonshot 2, the probe: re-render equivalence of a counter component proved by one step lemma and induction,
// with no renderer. Props and hook slots are data; Render maps them to the tree; Step is the handler's effect
// on the slots (read off its descriptor: ReactCall("set", [count + step])). The parent and the candidate
// are the same component written two ways (the candidate reorders the addition).
datatype JsxNode = JsxElem(tag: string, props: map<string, string>, children: seq<JsxNode>) | JsxText(s: string) | JsxNothing
datatype Props = Props(step: int)
datatype Slots = Slots(count: int)
function IntToString(i: int): string // uninterpreted: the same function on both sides

function Render_parent(p: Props, s: Slots): JsxNode { JsxElem("button", map["onClick" := "handler:inc"], [JsxText(IntToString(s.count))]) }
function Step_parent(p: Props, s: Slots): Slots { Slots(s.count + p.step) }

function Render_candidate(p: Props, s: Slots): JsxNode { JsxElem("button", map["onClick" := "handler:inc"], [JsxText(IntToString(s.count))]) }
function Step_candidate(p: Props, s: Slots): Slots { Slots(p.step + s.count + 1) } // the mutant: one more per click

// one step: equal props and slots give an equal tree and equal next slots
lemma Equal_step(p: Props, s: Slots)
  ensures Render_parent(p, s) == Render_candidate(p, s)
  ensures Step_parent(p, s) == Step_candidate(p, s)
{}

// every sequence of n clicks, by induction on the step lemma
function Run_parent(p: Props, s: Slots, n: nat): Slots decreases n { if n == 0 then s else Run_parent(p, Step_parent(p, s), n - 1) }
function Run_candidate(p: Props, s: Slots, n: nat): Slots decreases n { if n == 0 then s else Run_candidate(p, Step_candidate(p, s), n - 1) }
lemma Equal_run(p: Props, s: Slots, n: nat)
  ensures Run_parent(p, s, n) == Run_candidate(p, s, n)
  ensures Render_parent(p, Run_parent(p, s, n)) == Render_candidate(p, Run_candidate(p, s, n))
  decreases n
{
  if n > 0 { Equal_step(p, s); Equal_run(p, Step_parent(p, s), n - 1); }
}
