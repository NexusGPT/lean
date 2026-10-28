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
    def FilterIdx__int(s, p, i):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([(s)[0]]) if p((s)[0], i) else _dafny.SeqWithoutIsStrInference([])))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = p
                    in2_ = (i) + (1)
                    s = in0_
                    p = in1_
                    i = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def TruncDiv__int(a, b):
        d_0_q_ = _dafny.euclidian_division((a if (a) >= (0) else (0) - (a)), (b if (b) >= (0) else (0) - (b)))
        if ((a) >= (0)) == ((b) >= (0)):
            return d_0_q_
        elif True:
            return (0) - (d_0_q_)

    @staticmethod
    def JsRem__int(a, b):
        return (a) - ((b) * (default__.TruncDiv__int(a, b)))

    @staticmethod
    def MapIdx__int__int(s, f, i):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([f((s)[0], i)]))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = f
                    in2_ = (i) + (1)
                    s = in0_
                    f = in1_
                    i = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def FindIndexIdx__int(s, p, i):
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return -1
                elif p((s)[0], i):
                    return i
                elif True:
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = p
                    in2_ = (i) + (1)
                    s = in0_
                    p = in1_
                    i = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def evens(xs):
        def lambda0_(d_0_x_, d_1_i_):
            return (default__.JsRem__int(d_1_i_, 2)) == (0)

        return default__.FilterIdx__int(xs, lambda0_, 0)

    @staticmethod
    def weighted__loop0(seq0, idx0, total):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return total
                elif True:
                    d_0_v_ = (seq0)[idx0]
                    d_1_total_ = (total) + (d_0_v_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_total_
                    seq0 = in0_
                    idx0 = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def weighted(xs):
        d_0_total_ = 0
        def lambda0_(d_2_x_, d_3_i_):
            return (d_2_x_) * ((d_3_i_) + (1))

        d_1_total_ = default__.weighted__loop0(default__.MapIdx__int__int(xs, lambda0_, 0), 0, d_0_total_)
        return d_1_total_

    @staticmethod
    def first__above(xs, limit):
        def lambda0_(d_0_limit_):
            def lambda1_(d_1_x_, d_2_i_):
                def iife0_(_pat_let0_0):
                    def iife1_(d_3_ov0___):
                        return ((d_2_i_) > (0) if d_3_ov0___ else d_3_ov0___)
                    return iife1_(_pat_let0_0)
                return iife0_((d_1_x_) > (d_0_limit_))

            return lambda1_

        return default__.FindIndexIdx__int(xs, lambda0_(limit), 0)

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.weighted(_dafny.SeqWithoutIsStrInference([1, 2, 3]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.weighted(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.weighted(_dafny.SeqWithoutIsStrInference([5]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))


class Unit:
    @_dafny.classproperty
    def AllSingletonConstructors(cls):
        return [Unit_Unit()]
    @classmethod
    def default(cls, ):
        return lambda: Unit_Unit()
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Unit(self) -> bool:
        return isinstance(self, Unit_Unit)

class Unit_Unit(Unit, NamedTuple('Unit', [])):
    def __dafnystr__(self) -> str:
        return f'Unit.Unit'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Unit_Unit)
    def __hash__(self) -> int:
        return super().__hash__()

