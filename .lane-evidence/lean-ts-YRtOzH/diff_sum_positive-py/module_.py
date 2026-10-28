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
    def sum__positive__loop0(seq0, idx0, total):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return total
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    def iife0_(_pat_let0_0):
                        def iife1_(d_2_total_):
                            return d_2_total_
                        return iife1_(_pat_let0_0)
                    d_1_total_ = (iife0_((total) + (d_0_x_)) if (d_0_x_) > (0) else total)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_total_
                    seq0 = in0_
                    idx0 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def sum__positive(xs):
        d_0_total_ = 0
        d_1_total_ = default__.sum__positive__loop0(xs, 0, d_0_total_)
        return d_1_total_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.sum__positive(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.sum__positive(_dafny.SeqWithoutIsStrInference([1, -2, 3]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.sum__positive(_dafny.SeqWithoutIsStrInference([-1, -1]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.sum__positive(_dafny.SeqWithoutIsStrInference([5, 5, 5]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))

