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
    def double(x):
        return (x) * (2)

    @staticmethod
    def via__named(xs):
        def lambda0_(d_0_a0___):
            return default__.double(d_0_a0___)

        return default__.Map__int__int(xs, lambda0_)

    @staticmethod
    def via__local(xs, k):
        def lambda0_(d_1_k_):
            def lambda1_(d_2_x_):
                return (d_2_x_) * (d_1_k_)

            return lambda1_

        d_0_scale_ = lambda0_(k)
        def lambda2_(d_3_scale_):
            def lambda3_(d_4_a0___):
                return d_3_scale_(d_4_a0___)

            return lambda3_

        return default__.Map__int__int(xs, lambda2_(d_0_scale_))

    @staticmethod
    def call__local(a, b):
        def lambda0_(d_1_x_, d_2_y_):
            return (d_1_x_) + (d_2_y_)

        d_0_add_ = lambda0_
        return (d_0_add_(a, b)) + (d_0_add_(b, a))

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.via__named(_dafny.SeqWithoutIsStrInference([1, 2, 3]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.via__named(_dafny.SeqWithoutIsStrInference([]))))
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

