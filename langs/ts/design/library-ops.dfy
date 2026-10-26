// Draft heap-transition library over HWorld (stage-2 shape of translate/heap.mjs), one element type int, one record R.
type Ref = nat
datatype Obj = A_int(items: seq<int>) | R_pt(x: int, y: int) | Dead
datatype HWorld = HWorld(heap: map<Ref, Obj>, next: nat)

predicate IsA(hw: HWorld, r: Ref) { r in hw.heap && hw.heap[r].A_int? }
predicate IsR(hw: HWorld, r: Ref) { r in hw.heap && hw.heap[r].R_pt? }
function Items_int(hw: HWorld, r: Ref): seq<int> { if IsA(hw, r) then hw.heap[r].items else [] }
function Get_pt_x(hw: HWorld, r: Ref): int { if IsR(hw, r) then hw.heap[r].x else 0 }
function Get_pt_y(hw: HWorld, r: Ref): int { if IsR(hw, r) then hw.heap[r].y else 0 }

// allocation: a fresh reference, next increments
function AllocA(hw: HWorld, xs: seq<int>): (HWorld, Ref) { (HWorld(hw.heap[hw.next := A_int(xs)], hw.next + 1), hw.next) }
function AllocPt(hw: HWorld, x: int, y: int): (HWorld, Ref) { (HWorld(hw.heap[hw.next := R_pt(x, y)], hw.next + 1), hw.next) }

// in-place writes: the receiver keeps its reference
function SetItems(hw: HWorld, r: Ref, xs: seq<int>): HWorld { if IsA(hw, r) then hw.(heap := hw.heap[r := A_int(xs)]) else hw }

// push: mutates, returns the new length (the length is the call's result; the receiver is the same ref)
function Push(hw: HWorld, r: Ref, v: int): HWorld { SetItems(hw, r, Items_int(hw, r) + [v]) }
function PushLen(hw: HWorld, r: Ref, v: int): (HWorld, nat) { var h := Push(hw, r, v); (h, |Items_int(h, r)|) }

// clamp for ToClampedIndex-style bounds
function Clamp(i: int, lo: int, hi: int): int { if i < lo then lo else if i > hi then hi else i }

// splice(start, deleteCount, ...items): mutates r, returns a FRESH array of the removed elements
function Splice(hw: HWorld, r: Ref, start: int, dc: int, ins: seq<int>): (HWorld, Ref)
  ensures Splice(hw, r, start, dc, ins).0.next == hw.next + 1 || !IsA(hw, r)
{
  var xs := Items_int(hw, r);
  var s := Clamp(start, 0, |xs|);
  var d := Clamp(dc, 0, |xs| - s);
  var removed := xs[s .. s + d];
  var h1 := SetItems(hw, r, xs[..s] + ins + xs[s + d ..]);
  if IsA(hw, r) then AllocA(h1, removed) else (hw, hw.next)
}

// reverse: mutates r, returns r (same reference, not fresh)
function Rev(xs: seq<int>): seq<int> decreases |xs| { if |xs| == 0 then [] else Rev(xs[1..]) + [xs[0]] }
function Reverse(hw: HWorld, r: Ref): (HWorld, Ref) { (SetItems(hw, r, Rev(Items_int(hw, r))), r) }

// slice(start, end): fresh copy, receiver untouched
function Slice(hw: HWorld, r: Ref, s: int, e: int): (HWorld, Ref) {
  var xs := Items_int(hw, r);
  var a := Clamp(s, 0, |xs|); var b := Clamp(e, a, |xs|);
  AllocA(hw, xs[a .. b])
}

// concat(other): fresh array, receiver untouched
function Concat(hw: HWorld, r: Ref, q: Ref): (HWorld, Ref) { AllocA(hw, Items_int(hw, r) + Items_int(hw, q)) }

// sort with a pure comparator: the receiver is rewritten, its reference returned; order from an external stable sort
function {:extern} StableSortBy(xs: seq<int>, lt: (int, int) -> bool): seq<int>
function SortPure(hw: HWorld, r: Ref, lt: (int, int) -> bool): (HWorld, Ref) { (SetItems(hw, r, StableSortBy(Items_int(hw, r), lt)), r) }

// Object.assign(target, source) over a record shape: target fields overwritten in source key order, target returned
function AssignPt(hw: HWorld, t: Ref, s: Ref): (HWorld, Ref) {
  if IsR(hw, t) && IsR(hw, s) then (hw.(heap := hw.heap[t := R_pt(hw.heap[s].x, hw.heap[s].y)]), t) else (hw, t)
}

// Map<int,int> with insertion order: entries as a sequence of (key, value); SameValue on the key
datatype Entry = Entry(k: int, v: int)
function MapSetE(es: seq<Entry>, k: int, v: int): seq<Entry>
{ if exists i :: 0 <= i < |es| && es[i].k == k then seq(|es|, i requires 0 <= i < |es| => if es[i].k == k then Entry(k, v) else es[i]) else es + [Entry(k, v)] }

// lemmas the drafted transitions must satisfy
lemma PushGrows(hw: HWorld, r: Ref, v: int)
  requires IsA(hw, r)
  ensures |Items_int(Push(hw, r, v), r)| == |Items_int(hw, r)| + 1
{ }

lemma BadRefUnchanged(hw: HWorld, r: Ref, v: int)
  requires !IsA(hw, r)
  ensures Push(hw, r, v) == hw
{ }

lemma SpliceFresh(hw: HWorld, r: Ref, s: int, d: int, ins: seq<int>)
  requires IsA(hw, r)
  ensures Splice(hw, r, s, d, ins).1 == hw.next
{ }

lemma SliceFresh(hw: HWorld, r: Ref, s: int, e: int)
  requires r in hw.heap
  requires forall k :: k in hw.heap ==> k < hw.next
  ensures Slice(hw, r, s, e).1 == hw.next
  ensures Slice(hw, r, s, e).0.heap[r] == hw.heap[r]
{ }

lemma ReverseSameRef(hw: HWorld, r: Ref)
  ensures Reverse(hw, r).1 == r
{ }

lemma MapSetPreservesOrderLength(es: seq<Entry>, k: int, v: int)
  ensures |MapSetE(es, k, v)| >= |es|
{ }

// map(f): fresh array, receiver untouched; f must be a pure function (the lint's proof obligation)
function MapArr(hw: HWorld, r: Ref, f: int -> int): (HWorld, Ref)
{ var xs := Items_int(hw, r); AllocA(hw, seq(|xs|, i requires 0 <= i < |xs| => f(xs[i]))) }

// Set.add: no-op when present (SameValueZero on int keys), returns the same set
function SetAddE(es: seq<int>, v: int): seq<int> { if v in es then es else es + [v] }

// new Date(t): a Date cell with a time value; the no-argument form reads the clock (an input, fixed in lane B)
datatype Obj2 = D_cell(tv: int)
function AllocDate(hw: HWorld, tv: int): (HWorld, Ref) { (HWorld(hw.heap[hw.next := A_int([tv])], hw.next + 1), hw.next) }

method Main() {
  var hw := HWorld(map[], 0);
  var (h1, a) := AllocA(hw, [1, 2, 3]);
  var (h2, n) := PushLen(h1, a, 4);
  assert n == 4;
  var (h3, rem) := Splice(h2, a, 1, 2, [9]);
  assert Items_int(h3, a) == [1, 9, 4];
  assert Items_int(h3, rem) == [2, 3];
  var (h4, m) := MapArr(h3, a, (x: int) => x * 2);
  assert Items_int(h4, m) == [2, 18, 8];
  assert Items_int(h4, a) == [1, 9, 4];
  assert SetAddE([1, 2], 2) == [1, 2];
  assert SetAddE([1, 2], 3) == [1, 2, 3];
}
