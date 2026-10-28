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
    def Filter__int(s, p):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([(s)[0]]) if p((s)[0]) else _dafny.SeqWithoutIsStrInference([])))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = p
                    s = in0_
                    p = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def Map__int__int(s, f):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([f((s)[0])]))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = f
                    s = in0_
                    f = in1_
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
    def doubled__positives(xs):
        d_0_out_ = _dafny.SeqWithoutIsStrInference([])
        def lambda0_(d_2_x_):
            return not((d_2_x_) <= (0))

        def lambda1_(d_3_x_):
            def iife0_(_pat_let0_0):
                def iife1_(d_4_d_):
                    return (d_4_d_) + (1)
                return iife1_(_pat_let0_0)
            return iife0_((d_3_x_) * (2))

        d_1_out_ = (d_0_out_) + (default__.Map__int__int(default__.Filter__int(xs, lambda0_), lambda1_))
        return d_1_out_

    @staticmethod
    def small__odd(xs, lim):
        d_0_out_ = _dafny.SeqWithoutIsStrInference([7])
        def lambda0_(d_2_lim_):
            def lambda1_(d_3_x_):
                return ((d_3_x_) < (d_2_lim_)) and (not((default__.JsRem__int(d_3_x_, 2)) == (0)))

            return lambda1_

        d_1_out_ = (d_0_out_) + (default__.Filter__int(xs, lambda0_(lim)))
        return d_1_out_

    @staticmethod
    def shifted(xs, k):
        d_0_out_ = _dafny.SeqWithoutIsStrInference([])
        def lambda0_(d_2_k_):
            def lambda1_(d_3_x_):
                return not((d_3_x_) == (d_2_k_))

            return lambda1_

        def lambda2_(d_4_k_):
            def lambda3_(d_5_x_):
                return (d_5_x_) - (d_4_k_)

            return lambda3_

        d_1_out_ = (d_0_out_) + (default__.Map__int__int(default__.Filter__int(xs, lambda0_(k)), lambda2_(k)))
        return d_1_out_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.small__odd(_dafny.SeqWithoutIsStrInference([1, 2, 3, 9, 5]), 6)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.small__odd(_dafny.SeqWithoutIsStrInference([]), 0)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.small__odd(_dafny.SeqWithoutIsStrInference([4, 7]), 10)))
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

