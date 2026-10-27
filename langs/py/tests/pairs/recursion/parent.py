from dataclasses import dataclass


@dataclass(frozen=True)
class Node:
    v: int
    kids: list["Node"]


def total(n: Node) -> int:
    t = n.v
    for k in n.kids:
        t = t + total(k)
    return t


def depth(n: Node) -> int:
    d = 0
    for k in n.kids:
        x = depth(k) + 1
        if x > d:
            d = x
    return d
