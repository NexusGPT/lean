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
    def sum__positive__general__loop0(xs, acc, i):
        while True:
            with _dafny.label():
                if not((i) < (len(xs))):
                    return (acc, i)
                elif ((xs)[i]) <= (0):
                    d_0_i_ = (i) + (1)
                    in0_ = xs
                    in1_ = acc
                    in2_ = d_0_i_
                    xs = in0_
                    acc = in1_
                    i = in2_
                    raise _dafny.TailCall()
                elif True:
                    d_1_acc_ = (acc) + ((xs)[i])
                    d_2_i_ = (i) + (1)
                    in3_ = xs
                    in4_ = d_1_acc_
                    in5_ = d_2_i_
                    xs = in3_
                    acc = in4_
                    i = in5_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def sum__positive__general(xs):
        d_0_acc_ = 0
        d_1_i_ = 0
        let_tmp_rhs0_ = default__.sum__positive__general__loop0(xs, d_0_acc_, d_1_i_)
        d_2_acc_ = let_tmp_rhs0_[0]
        d_3_i_ = let_tmp_rhs0_[1]
        return d_2_acc_

    @staticmethod
    def first__negative__general__loop0(xs, i):
        while True:
            with _dafny.label():
                if not((i) < (len(xs))):
                    return (Option_None(), i)
                elif ((xs)[i]) < (0):
                    return (Option_Some(i), i)
                elif True:
                    d_0_i_ = (i) + (1)
                    in0_ = xs
                    in1_ = d_0_i_
                    xs = in0_
                    i = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def first__negative__general(xs):
        d_0_i_ = 0
        let_tmp_rhs0_ = default__.first__negative__general__loop0(xs, d_0_i_)
        d_1_ret0_ = let_tmp_rhs0_[0]
        d_2_i_ = let_tmp_rhs0_[1]
        if (d_1_ret0_).is_Some:
            return (d_1_ret0_).value
        elif True:
            return -1

    @staticmethod
    def repeat__add__loop0(n, k, c, i):
        while True:
            with _dafny.label():
                if not((i) < (n)):
                    return (c, i)
                elif True:
                    d_0_c_ = (c) + (k)
                    d_1_i_ = (i) + (1)
                    in0_ = n
                    in1_ = k
                    in2_ = d_0_c_
                    in3_ = d_1_i_
                    n = in0_
                    k = in1_
                    c = in2_
                    i = in3_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def repeat__add(k):
        d_0_n_ = 3
        d_1_c_ = 0
        d_2_i_ = 0
        let_tmp_rhs0_ = default__.repeat__add__loop0(d_0_n_, k, d_1_c_, d_2_i_)
        d_3_c_ = let_tmp_rhs0_[0]
        d_4_i_ = let_tmp_rhs0_[1]
        return d_3_c_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.repeat__add(2)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.repeat__add(0)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.repeat__add(-3)))
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


class Option:
    @classmethod
    def default(cls, ):
        return lambda: Option_None()
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_None(self) -> bool:
        return isinstance(self, Option_None)
    @property
    def is_Some(self) -> bool:
        return isinstance(self, Option_Some)

class Option_None(Option, NamedTuple('None_', [])):
    def __dafnystr__(self) -> str:
        return f'Option.None'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Option_None)
    def __hash__(self) -> int:
        return super().__hash__()

class Option_Some(Option, NamedTuple('Some', [('value', Any)])):
    def __dafnystr__(self) -> str:
        return f'Option.Some({_dafny.string_of(self.value)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Option_Some) and self.value == __o.value
    def __hash__(self) -> int:
        return super().__hash__()

