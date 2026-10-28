import sys
from typing import Callable, Any, TypeVar, NamedTuple
from math import floor
from itertools import count

import module_ as module_
import _dafny as _dafny
import System_ as System_

# Module: module_

class default__:
    def  __init__(self):
        pass

    @staticmethod
    def sum__even__indices__loop0(i, xs, total):
        while True:
            with _dafny.label():
                if not((i) < (len(xs))):
                    return total
                elif True:
                    d_0_total_ = (total) + ((xs)[i])
                    in0_ = (i) + (2)
                    in1_ = xs
                    in2_ = d_0_total_
                    i = in0_
                    xs = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def sum__even__indices(xs):
        d_0_total_ = 0
        d_1_total_ = default__.sum__even__indices__loop0(0, xs, d_0_total_)
        return d_1_total_

    @staticmethod
    def count__down__loop0(i, n, acc):
        while True:
            with _dafny.label():
                if not((i) > (0)):
                    return acc
                elif True:
                    d_0_acc_ = (acc) + (i)
                    in0_ = (i) - (1)
                    in1_ = n
                    in2_ = d_0_acc_
                    i = in0_
                    n = in1_
                    acc = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def count__down(n):
        d_0_acc_ = 0
        d_1_acc_ = default__.count__down__loop0(n, n, d_0_acc_)
        return d_1_acc_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.count__down(4)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.count__down(0)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.count__down(-2)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))

