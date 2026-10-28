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
    def nested__exits__loop2(seq2, idx2, mode, x, total):
        while True:
            with _dafny.label():
                if (idx2) >= (len(seq2)):
                    return (0, Option_None(), total)
                elif True:
                    d_0_y_ = (seq2)[idx2]
                    d_1_total_ = (total) + (1)
                    if (mode) == (0):
                        return (1, Option_None(), d_1_total_)
                    elif (mode) == (1):
                        return (-1, Option_None(), d_1_total_)
                    elif (mode) == (2):
                        return (0, Option_Some(d_1_total_), d_1_total_)
                    elif (x) == (d_0_y_):
                        return (0, Option_None(), d_1_total_)
                    elif True:
                        in0_ = seq2
                        in1_ = (idx2) + (1)
                        in2_ = mode
                        in3_ = x
                        in4_ = d_1_total_
                        seq2 = in0_
                        idx2 = in1_
                        mode = in2_
                        x = in3_
                        total = in4_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def nested__exits__loop1(seq1, idx1, xs, mode, total):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return (0, Option_None(), total)
                elif True:
                    d_0_x_ = (seq1)[idx1]
                    let_tmp_rhs0_ = default__.nested__exits__loop2(xs, 0, mode, d_0_x_, total)
                    d_1_jump2_ = let_tmp_rhs0_[0]
                    d_2_ret2_ = let_tmp_rhs0_[1]
                    d_3_total_ = let_tmp_rhs0_[2]
                    if (d_1_jump2_) != (0):
                        if (d_1_jump2_) == (1):
                            return (1, Option_None(), d_3_total_)
                        elif True:
                            return (-1, Option_None(), d_3_total_)
                    elif (d_2_ret2_).is_Some:
                        return (0, Option_Some((d_2_ret2_).value), d_3_total_)
                    elif True:
                        d_4_total_ = (d_3_total_) + (10)
                        in0_ = seq1
                        in1_ = (idx1) + (1)
                        in2_ = xs
                        in3_ = mode
                        in4_ = d_4_total_
                        seq1 = in0_
                        idx1 = in1_
                        xs = in2_
                        mode = in3_
                        total = in4_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def nested__exits__loop0(i, xs, mode, total):
        while True:
            with _dafny.label():
                if not((i) < (len(xs))):
                    return (Option_None(), total)
                elif True:
                    let_tmp_rhs0_ = default__.nested__exits__loop1(xs, 0, xs, mode, total)
                    d_0_jump1_ = let_tmp_rhs0_[0]
                    d_1_ret1_ = let_tmp_rhs0_[1]
                    d_2_total_ = let_tmp_rhs0_[2]
                    if (d_0_jump1_) != (0):
                        if (d_0_jump1_) == (1):
                            return (Option_None(), d_2_total_)
                        elif True:
                            in0_ = (i) + (1)
                            in1_ = xs
                            in2_ = mode
                            in3_ = d_2_total_
                            i = in0_
                            xs = in1_
                            mode = in2_
                            total = in3_
                            raise _dafny.TailCall()
                    elif (d_1_ret1_).is_Some:
                        return (Option_Some((d_1_ret1_).value), d_2_total_)
                    elif True:
                        d_3_total_ = (d_2_total_) + (100)
                        in4_ = (i) + (1)
                        in5_ = xs
                        in6_ = mode
                        in7_ = d_3_total_
                        i = in4_
                        xs = in5_
                        mode = in6_
                        total = in7_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def nested__exits(xs, mode):
        d_0_total_ = 0
        let_tmp_rhs0_ = default__.nested__exits__loop0(0, xs, mode, d_0_total_)
        d_1_ret0_ = let_tmp_rhs0_[0]
        d_2_total_ = let_tmp_rhs0_[1]
        if (d_1_ret0_).is_Some:
            return (d_1_ret0_).value
        elif True:
            return d_2_total_

    @staticmethod
    def switch__control__loop1(seq1, idx1, total):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return total
                elif True:
                    d_0_y_ = (seq1)[idx1]
                    if (d_0_y_) < (0):
                        return total
                    elif True:
                        d_1_total_ = (total) + (1)
                        in0_ = seq1
                        in1_ = (idx1) + (1)
                        in2_ = d_1_total_
                        seq1 = in0_
                        idx1 = in1_
                        total = in2_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def switch__control__loop2(seq2, idx2, total):
        while True:
            with _dafny.label():
                if (idx2) >= (len(seq2)):
                    return total
                elif True:
                    d_0_y_ = (seq2)[idx2]
                    if (d_0_y_) < (0):
                        return total
                    elif True:
                        d_1_total_ = (total) + (1)
                        in0_ = seq2
                        in1_ = (idx2) + (1)
                        in2_ = d_1_total_
                        seq2 = in0_
                        idx2 = in1_
                        total = in2_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def switch__control__loop3(seq3, idx3, total):
        while True:
            with _dafny.label():
                if (idx3) >= (len(seq3)):
                    return total
                elif True:
                    d_0_y_ = (seq3)[idx3]
                    if (d_0_y_) < (0):
                        return total
                    elif True:
                        d_1_total_ = (total) + (1)
                        in0_ = seq3
                        in1_ = (idx3) + (1)
                        in2_ = d_1_total_
                        seq3 = in0_
                        idx3 = in1_
                        total = in2_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def switch__control__loop0(seq0, idx0, mode, xs, total):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return total
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    d_1_switch0___ = mode
                    d_2_start1___ = (0 if (d_1_switch0___) == (0) else (2 if (d_1_switch0___) == (2) else 1))
                    if (d_2_start1___) == (0):
                        if (d_0_x_) < (0):
                            d_3_total_ = (total) + (100)
                            in0_ = seq0
                            in1_ = (idx0) + (1)
                            in2_ = mode
                            in3_ = xs
                            in4_ = d_3_total_
                            seq0 = in0_
                            idx0 = in1_
                            mode = in2_
                            xs = in3_
                            total = in4_
                            raise _dafny.TailCall()
                        elif True:
                            d_4_total_ = (total) + (1)
                            d_5_total_ = (d_4_total_) + (10)
                            if (d_0_x_) < (0):
                                in5_ = seq0
                                in6_ = (idx0) + (1)
                                in7_ = mode
                                in8_ = xs
                                in9_ = d_5_total_
                                seq0 = in5_
                                idx0 = in6_
                                mode = in7_
                                xs = in8_
                                total = in9_
                                raise _dafny.TailCall()
                            elif True:
                                d_6_total_ = default__.switch__control__loop3(xs, 0, d_5_total_)
                                d_7_switch6___ = d_0_x_
                                d_8_start7___ = (0 if (d_7_switch6___) == (0) else 1)
                                if (d_8_start7___) == (0):
                                    d_9_total_ = (d_6_total_) + (2)
                                    d_10_total_ = (d_9_total_) + (100)
                                    in10_ = seq0
                                    in11_ = (idx0) + (1)
                                    in12_ = mode
                                    in13_ = xs
                                    in14_ = d_10_total_
                                    seq0 = in10_
                                    idx0 = in11_
                                    mode = in12_
                                    xs = in13_
                                    total = in14_
                                    raise _dafny.TailCall()
                                elif True:
                                    d_11_total_ = (d_6_total_) + (3)
                                    d_12_total_ = (d_11_total_) + (100)
                                    in15_ = seq0
                                    in16_ = (idx0) + (1)
                                    in17_ = mode
                                    in18_ = xs
                                    in19_ = d_12_total_
                                    seq0 = in15_
                                    idx0 = in16_
                                    mode = in17_
                                    xs = in18_
                                    total = in19_
                                    raise _dafny.TailCall()
                    elif (d_2_start1___) == (2):
                        if (d_0_x_) < (0):
                            in20_ = seq0
                            in21_ = (idx0) + (1)
                            in22_ = mode
                            in23_ = xs
                            in24_ = total
                            seq0 = in20_
                            idx0 = in21_
                            mode = in22_
                            xs = in23_
                            total = in24_
                            raise _dafny.TailCall()
                        elif True:
                            d_13_total_ = default__.switch__control__loop2(xs, 0, total)
                            d_14_switch4___ = d_0_x_
                            d_15_start5___ = (0 if (d_14_switch4___) == (0) else 1)
                            if (d_15_start5___) == (0):
                                d_16_total_ = (d_13_total_) + (2)
                                d_17_total_ = (d_16_total_) + (100)
                                in25_ = seq0
                                in26_ = (idx0) + (1)
                                in27_ = mode
                                in28_ = xs
                                in29_ = d_17_total_
                                seq0 = in25_
                                idx0 = in26_
                                mode = in27_
                                xs = in28_
                                total = in29_
                                raise _dafny.TailCall()
                            elif True:
                                d_18_total_ = (d_13_total_) + (3)
                                d_19_total_ = (d_18_total_) + (100)
                                in30_ = seq0
                                in31_ = (idx0) + (1)
                                in32_ = mode
                                in33_ = xs
                                in34_ = d_19_total_
                                seq0 = in30_
                                idx0 = in31_
                                mode = in32_
                                xs = in33_
                                total = in34_
                                raise _dafny.TailCall()
                    elif True:
                        d_20_total_ = (total) + (10)
                        if (d_0_x_) < (0):
                            in35_ = seq0
                            in36_ = (idx0) + (1)
                            in37_ = mode
                            in38_ = xs
                            in39_ = d_20_total_
                            seq0 = in35_
                            idx0 = in36_
                            mode = in37_
                            xs = in38_
                            total = in39_
                            raise _dafny.TailCall()
                        elif True:
                            d_21_total_ = default__.switch__control__loop1(xs, 0, d_20_total_)
                            d_22_switch2___ = d_0_x_
                            d_23_start3___ = (0 if (d_22_switch2___) == (0) else 1)
                            if (d_23_start3___) == (0):
                                d_24_total_ = (d_21_total_) + (2)
                                d_25_total_ = (d_24_total_) + (100)
                                in40_ = seq0
                                in41_ = (idx0) + (1)
                                in42_ = mode
                                in43_ = xs
                                in44_ = d_25_total_
                                seq0 = in40_
                                idx0 = in41_
                                mode = in42_
                                xs = in43_
                                total = in44_
                                raise _dafny.TailCall()
                            elif True:
                                d_26_total_ = (d_21_total_) + (3)
                                d_27_total_ = (d_26_total_) + (100)
                                in45_ = seq0
                                in46_ = (idx0) + (1)
                                in47_ = mode
                                in48_ = xs
                                in49_ = d_27_total_
                                seq0 = in45_
                                idx0 = in46_
                                mode = in47_
                                xs = in48_
                                total = in49_
                                raise _dafny.TailCall()
                break

    @staticmethod
    def switch__control(xs, mode):
        d_0_total_ = 0
        d_1_total_ = default__.switch__control__loop0(xs, 0, mode, xs, d_0_total_)
        return d_1_total_

    @staticmethod
    def finite__while__loop0(xs, i, total):
        while True:
            with _dafny.label():
                if not((i) < (len(xs))):
                    return (i, total)
                elif True:
                    d_0_total_ = (total) + (1)
                    d_1_i_ = (i) + (2)
                    in0_ = xs
                    in1_ = d_1_i_
                    in2_ = d_0_total_
                    xs = in0_
                    i = in1_
                    total = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def finite__while(start, xs):
        d_0_i_ = start
        d_1_total_ = 0
        let_tmp_rhs0_ = default__.finite__while__loop0(xs, d_0_i_, d_1_total_)
        d_2_i_ = let_tmp_rhs0_[0]
        d_3_total_ = let_tmp_rhs0_[1]
        return d_3_total_

    @staticmethod
    def downward__while__loop0(i, total):
        while True:
            with _dafny.label():
                if not((i) >= (0)):
                    return (i, total)
                elif (i) == (2):
                    return (i, total)
                elif True:
                    d_0_total_ = (total) + (1)
                    d_1_i_ = (i) - (2)
                    in0_ = d_1_i_
                    in1_ = d_0_total_
                    i = in0_
                    total = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def downward__while(start):
        d_0_i_ = start
        d_1_total_ = 0
        let_tmp_rhs0_ = default__.downward__while__loop0(d_0_i_, d_1_total_)
        d_2_i_ = let_tmp_rhs0_[0]
        d_3_total_ = let_tmp_rhs0_[1]
        return d_3_total_

    @staticmethod
    def labelled__do__loop1(j, i, total):
        while True:
            with _dafny.label():
                if not((j) < (2)):
                    return (0, total)
                elif True:
                    d_0_total_ = (total) + (1)
                    if (i) <= (0):
                        return (1, d_0_total_)
                    elif True:
                        in0_ = (j) + (1)
                        in1_ = i
                        in2_ = d_0_total_
                        j = in0_
                        i = in1_
                        total = in2_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def labelled__do__loop0(first0, i, total):
        while True:
            with _dafny.label():
                if (not(first0)) and (not((i) > (0))):
                    return (i, total)
                elif True:
                    let_tmp_rhs0_ = default__.labelled__do__loop1(0, i, total)
                    d_0_jump1_ = let_tmp_rhs0_[0]
                    d_1_total_ = let_tmp_rhs0_[1]
                    if (d_0_jump1_) != (0):
                        return (i, d_1_total_)
                    elif True:
                        d_2_i_ = (i) - (1)
                        if (d_2_i_) == (1):
                            in0_ = False
                            in1_ = d_2_i_
                            in2_ = d_1_total_
                            first0 = in0_
                            i = in1_
                            total = in2_
                            raise _dafny.TailCall()
                        elif True:
                            d_3_total_ = (d_1_total_) + (10)
                            in3_ = False
                            in4_ = d_2_i_
                            in5_ = d_3_total_
                            first0 = in3_
                            i = in4_
                            total = in5_
                            raise _dafny.TailCall()
                break

    @staticmethod
    def labelled__do(n):
        d_0_i_ = n
        d_1_total_ = 0
        let_tmp_rhs0_ = default__.labelled__do__loop0(True, d_0_i_, d_1_total_)
        d_2_i_ = let_tmp_rhs0_[0]
        d_3_total_ = let_tmp_rhs0_[1]
        return d_3_total_

    @staticmethod
    def labelled__while__loop1(seq1, idx1, total):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return (0, total)
                elif True:
                    d_0_x_ = (seq1)[idx1]
                    if (d_0_x_) < (0):
                        return (1, total)
                    elif True:
                        d_1_total_ = (total) + (1)
                        in0_ = seq1
                        in1_ = (idx1) + (1)
                        in2_ = d_1_total_
                        seq1 = in0_
                        idx1 = in1_
                        total = in2_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def labelled__while__loop0(xs, i, total):
        while True:
            with _dafny.label():
                if not((i) > (0)):
                    return (i, total)
                elif True:
                    let_tmp_rhs0_ = default__.labelled__while__loop1(xs, 0, total)
                    d_0_jump1_ = let_tmp_rhs0_[0]
                    d_1_total_ = let_tmp_rhs0_[1]
                    if (d_0_jump1_) != (0):
                        return (i, d_1_total_)
                    elif True:
                        d_2_i_ = (i) - (1)
                        in0_ = xs
                        in1_ = d_2_i_
                        in2_ = d_1_total_
                        xs = in0_
                        i = in1_
                        total = in2_
                        raise _dafny.TailCall()
                break

    @staticmethod
    def labelled__while(n, xs):
        d_0_i_ = n
        d_1_total_ = 0
        let_tmp_rhs0_ = default__.labelled__while__loop0(xs, d_0_i_, d_1_total_)
        d_2_i_ = let_tmp_rhs0_[0]
        d_3_total_ = let_tmp_rhs0_[1]
        return d_3_total_

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.switch__control(_dafny.SeqWithoutIsStrInference([]), 0)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.switch__control(_dafny.SeqWithoutIsStrInference([0, 1, -1]), 0)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.switch__control(_dafny.SeqWithoutIsStrInference([0, 1, -1]), 1)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.switch__control(_dafny.SeqWithoutIsStrInference([0, 1, -1]), 2)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.switch__control(_dafny.SeqWithoutIsStrInference([1, 2]), 9)))
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

