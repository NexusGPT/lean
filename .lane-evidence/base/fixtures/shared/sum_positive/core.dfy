// Core form of sum_positive, written by hand. The translation of ts.ts must carry the same signature.
method sumPositive(xs: seq<int>) returns (result: int)
  ensures result >= 0
{
  var total: int := 0;
  var seq0 := xs;
  var idx0 := 0;
  while idx0 < |seq0|
    invariant 0 <= idx0 <= |seq0|
    invariant total >= 0
    decreases |seq0| - idx0
  {
    var x: int := seq0[idx0];
    if x > 0 {
      total := total + x;
    }
    idx0 := idx0 + 1;
  }
  return total;
}
