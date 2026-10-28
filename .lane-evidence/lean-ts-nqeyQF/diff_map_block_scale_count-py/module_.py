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
    def scaled(xs, seen):
        d_0_seen_ = seen
        d_1_seen_ = (d_0_seen_) + (_dafny.SeqWithoutIsStrInference([len(xs)]))
        def lambda0_(d_2_x_):
            return ((d_2_x_) * (2) if (d_2_x_) > (0) else (0) - (d_2_x_))

        return (default__.Map__int__int(xs, lambda0_), d_1_seen_)

    @staticmethod
    def scale__count(xs):
        d_0_seen_ = _dafny.SeqWithoutIsStrInference([7])
        let_tmp_rhs0_ = default__.scaled(xs, d_0_seen_)
        d_1_t0___ = let_tmp_rhs0_[0]
        d_2_t0__m0_ = let_tmp_rhs0_[1]
        d_3_seen_ = d_2_t0__m0_
        d_4_out_ = d_1_t0___
        return (d_4_out_) + (d_3_seen_)

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.scale__count(_dafny.SeqWithoutIsStrInference([3, -2, 0]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.scale__count(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.scale__count(_dafny.SeqWithoutIsStrInference([5]))))
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

