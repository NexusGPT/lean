def average(xs: list[int]) -> int:
    if len(xs) == 0:
        return 0
    total = 0
    for x in xs:
        total += x
    return total // len(xs)


def vat(net: int, rate: int) -> int:
    return net + net * rate // 100


def discounted(price: int, percent: int) -> int:
    return price * (100 - percent) // 100


def pages(total: int, size: int) -> int:
    return total // size + 1
