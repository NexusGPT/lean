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
    def count__down__loop0(n, i, steps):
        while True:
            with _dafny.label():
                if not((i) > (0)):
                    return (i, steps)
                elif True:
                    d_0_i_ = (i) - (1)
                    d_1_steps_ = (steps) + (1)
                    in0_ = n
                    in1_ = d_0_i_
                    in2_ = d_1_steps_
                    n = in0_
                    i = in1_
                    steps = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def count__down(n):
        d_0_i_ = n
        d_1_steps_ = 0
        let_tmp_rhs0_ = default__.count__down__loop0(n, d_0_i_, d_1_steps_)
        d_2_i_ = let_tmp_rhs0_[0]
        d_3_steps_ = let_tmp_rhs0_[1]
        return d_3_steps_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.count__down(0)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.count__down(3)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.count__down(7)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))

