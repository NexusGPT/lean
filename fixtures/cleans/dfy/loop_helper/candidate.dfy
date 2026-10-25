function total_loop0_candidate(xs: seq<int>, acc: int): int
  decreases |xs|
{
  if |xs| == 0 then acc else total_loop0_candidate(xs[1..], acc + xs[0])
}

function total_candidate(xs: seq<int>): int
{
  if |xs| == 0 then 7 else total_loop0_candidate(xs, 0)
}
