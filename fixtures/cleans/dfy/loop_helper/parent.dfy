function total_loop0_parent(xs: seq<int>, acc: int): int
  decreases |xs|
{
  if |xs| == 0 then acc else total_loop0_parent(xs[1..], acc + xs[0])
}

function total_parent(xs: seq<int>): int
{
  total_loop0_parent(xs, 0)
}
