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
    def add(this__, k):
        pat_let_tv0_ = k
        pat_let_tv1_ = k
        d_0_this___ = this__
        def iife0_(_pat_let0_0):
            def iife1_(d_2_dt__update__tmp_h0_):
                def iife2_(_pat_let1_0):
                    def iife3_(d_3_dt__update_hn_h0_):
                        return Tally_Tally((d_2_dt__update__tmp_h0_).last, (d_2_dt__update__tmp_h0_).meta, d_3_dt__update_hn_h0_, (d_2_dt__update__tmp_h0_).open__rest__)
                    return iife3_(_pat_let1_0)
                return iife2_(((d_0_this___).n) + (pat_let_tv0_))
            return iife1_(_pat_let0_0)
        d_1_this___ = iife0_(d_0_this___)
        def iife4_(_pat_let2_0):
            def iife5_(d_5_dt__update__tmp_h1_):
                def iife6_(_pat_let3_0):
                    def iife7_(d_6_dt__update_hlast_h0_):
                        return Tally_Tally(d_6_dt__update_hlast_h0_, (d_5_dt__update__tmp_h1_).meta, (d_5_dt__update__tmp_h1_).n, (d_5_dt__update__tmp_h1_).open__rest__)
                    return iife7_(_pat_let3_0)
                return iife6_(pat_let_tv1_)
            return iife5_(_pat_let2_0)
        d_4_this___ = iife4_(d_1_this___)
        def iife8_(_pat_let4_0):
            def iife9_(d_8_dt__update__tmp_h2_):
                def iife11_(_pat_let6_0):
                    def iife12_(d_9_dt__update__tmp_h3_):
                        def iife13_(_pat_let7_0):
                            def iife14_(d_10_dt__update_hhits_h0_):
                                return Rec__yj0sxv_Rec__yj0sxv(d_10_dt__update_hhits_h0_, (d_9_dt__update__tmp_h3_).open__rest__)
                            return iife14_(_pat_let7_0)
                        return iife13_((((d_4_this___).meta).hits) + (1))
                    return iife12_(_pat_let6_0)
                def iife10_(_pat_let5_0):
                    def iife15_(d_11_dt__update_hmeta_h0_):
                        return Tally_Tally((d_8_dt__update__tmp_h2_).last, d_11_dt__update_hmeta_h0_, (d_8_dt__update__tmp_h2_).n, (d_8_dt__update__tmp_h2_).open__rest__)
                    return iife15_(_pat_let5_0)
                return iife10_(iife11_((d_4_this___).meta))
            return iife9_(_pat_let4_0)
        d_7_this___ = iife8_(d_4_this___)
        return ((d_7_this___).n, d_7_this___)

    @staticmethod
    def sum__all__loop0(seq0, idx0, t):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return t
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    let_tmp_rhs0_ = default__.add(t, d_0_x_)
                    d_1_t0___ = let_tmp_rhs0_[0]
                    d_2_t0__m0_ = let_tmp_rhs0_[1]
                    d_3_t_ = d_2_t0__m0_
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_3_t_
                    seq0 = in0_
                    idx0 = in1_
                    t = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def sum__all(xs):
        d_0_t_ = Tally_Tally(0, Rec__yj0sxv_Rec__yj0sxv(0, More_MoreBuilt()), 0, More_MoreBuilt())
        d_1_t_ = default__.sum__all__loop0(xs, 0, d_0_t_)
        return ((((d_1_t_).n) * (100)) + (((d_1_t_).last) * (10))) + (((d_1_t_).meta).hits)

    @staticmethod
    def twice(a, b):
        d_0_t_ = Tally_Tally(0, Rec__yj0sxv_Rec__yj0sxv(0, More_MoreBuilt()), a, More_MoreBuilt())
        let_tmp_rhs0_ = default__.add(d_0_t_, b)
        d_1_t0___ = let_tmp_rhs0_[0]
        d_2_t0__m0_ = let_tmp_rhs0_[1]
        d_3_t_ = d_2_t0__m0_
        d_4_first_ = d_1_t0___
        let_tmp_rhs1_ = default__.add(d_3_t_, d_4_first_)
        d_5_t1___ = let_tmp_rhs1_[0]
        d_6_t1__m0_ = let_tmp_rhs1_[1]
        d_7_t_ = d_6_t1__m0_
        return (((d_7_t_).n) * (10)) + (((d_7_t_).meta).hits)

    @staticmethod
    def each__add__loop0(seq0, idx0, t):
        while True:
            with _dafny.label():
                if (idx0) >= (len(seq0)):
                    return t
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    let_tmp_rhs0_ = default__.add(t, d_0_x_)
                    d_1_t0___ = let_tmp_rhs0_[0]
                    d_2_t0__m0_ = let_tmp_rhs0_[1]
                    d_3_t_ = d_2_t0__m0_
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_3_t_
                    seq0 = in0_
                    idx0 = in1_
                    t = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def each__add(xs):
        d_0_t_ = Tally_Tally(0, Rec__yj0sxv_Rec__yj0sxv(0, More_MoreBuilt()), 1, More_MoreBuilt())
        d_1_t_ = default__.each__add__loop0(xs, 0, d_0_t_)
        return (((d_1_t_).n) * (10)) + (((d_1_t_).meta).hits)

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.sum__all(_dafny.SeqWithoutIsStrInference([1, 2, 3]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.sum__all(_dafny.SeqWithoutIsStrInference([]))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.sum__all(_dafny.SeqWithoutIsStrInference([-4]))))
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


class Tally:
    @classmethod
    def default(cls, ):
        return lambda: Tally_Tally(int(0), Rec__yj0sxv.default()(), int(0), More.default()())
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Tally(self) -> bool:
        return isinstance(self, Tally_Tally)

class Tally_Tally(Tally, NamedTuple('Tally', [('last', Any), ('meta', Any), ('n', Any), ('open__rest__', Any)])):
    def __dafnystr__(self) -> str:
        return f'Tally.Tally({_dafny.string_of(self.last)}, {_dafny.string_of(self.meta)}, {_dafny.string_of(self.n)}, {_dafny.string_of(self.open__rest__)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Tally_Tally) and self.last == __o.last and self.meta == __o.meta and self.n == __o.n and self.open__rest__ == __o.open__rest__
    def __hash__(self) -> int:
        return super().__hash__()


class Rec__yj0sxv:
    @classmethod
    def default(cls, ):
        return lambda: Rec__yj0sxv_Rec__yj0sxv(int(0), More.default()())
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_Rec__yj0sxv(self) -> bool:
        return isinstance(self, Rec__yj0sxv_Rec__yj0sxv)

class Rec__yj0sxv_Rec__yj0sxv(Rec__yj0sxv, NamedTuple('Rec__yj0sxv', [('hits', Any), ('open__rest__', Any)])):
    def __dafnystr__(self) -> str:
        return f'Rec_yj0sxv.Rec_yj0sxv({_dafny.string_of(self.hits)}, {_dafny.string_of(self.open__rest__)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, Rec__yj0sxv_Rec__yj0sxv) and self.hits == __o.hits and self.open__rest__ == __o.open__rest__
    def __hash__(self) -> int:
        return super().__hash__()


class More:
    @classmethod
    def default(cls, ):
        return lambda: More_MoreBuilt()
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_MoreBuilt(self) -> bool:
        return isinstance(self, More_MoreBuilt)
    @property
    def is_MoreFrom(self) -> bool:
        return isinstance(self, More_MoreFrom)

class More_MoreBuilt(More, NamedTuple('MoreBuilt', [])):
    def __dafnystr__(self) -> str:
        return f'More.MoreBuilt'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, More_MoreBuilt)
    def __hash__(self) -> int:
        return super().__hash__()

class More_MoreFrom(More, NamedTuple('MoreFrom', [('src', Any)])):
    def __dafnystr__(self) -> str:
        return f'More.MoreFrom({_dafny.string_of(self.src)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, More_MoreFrom) and self.src == __o.src
    def __hash__(self) -> int:
        return super().__hash__()

