// Core form of filter_then_sum, written by hand. The translation of ts.ts must carry the same signature.
function Filter<T>(s: seq<T>, p: T -> bool): (r: seq<T>)
  ensures |r| <= |s|
  ensures forall i :: 0 <= i < |r| ==> p(r[i])
  decreases |s|
{
  if |s| == 0 then []
  else (if p(s[0]) then [s[0]] else []) + Filter(s[1..], p)
}

method sumOfPositives(xs: seq<int>) returns (result: int)
  ensures result >= 0
{
  var positives: seq<int> := Filter(xs, (x: int) => x > 0);
  var total: int := 0;
  var seq0 := positives;
  var idx0 := 0;
  while idx0 < |seq0|
    invariant 0 <= idx0 <= |seq0|
    invariant total >= 0
    decreases |seq0| - idx0
  {
    var x: int := seq0[idx0];
    total := total + x;
    idx0 := idx0 + 1;
  }
  return total;
}
