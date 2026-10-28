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
    def squares__loop0(i, n, out):
        while True:
            with _dafny.label():
                if not((i) < (n)):
                    return out
                elif True:
                    d_0_out_ = (out) + (_dafny.SeqWithoutIsStrInference([(i) * (i)]))
                    in0_ = (i) + (1)
                    in1_ = n
                    in2_ = d_0_out_
                    i = in0_
                    n = in1_
                    out = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def squares(n):
        d_0_out_ = _dafny.SeqWithoutIsStrInference([])
        d_1_out_ = default__.squares__loop0(0, n, d_0_out_)
        return d_1_out_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.squares(0)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.squares(1)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.squares(5)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))

