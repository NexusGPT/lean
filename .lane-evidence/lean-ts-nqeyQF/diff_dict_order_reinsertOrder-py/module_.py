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
    def SeqRemove(s, x):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([]) if ((s)[0]) == (x) else _dafny.SeqWithoutIsStrInference([(s)[0]])))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = x
                    s = in0_
                    x = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def OMapPut(o, k, v):
        if (k) in ((o).m):
            return OMap_OMap((o).keys, ((o).m).set(k, v))
        elif True:
            return OMap_OMap(((o).keys) + (_dafny.SeqWithoutIsStrInference([k])), ((o).m).set(k, v))

    @staticmethod
    def OMapDel(o, k):
        if (k) in ((o).m):
            return OMap_OMap(default__.SeqRemove((o).keys, k), ((o).m) - (_dafny.Set({k})))
        elif True:
            return o

    @staticmethod
    def OMapVals(ks, m):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(ks)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([(m)[(ks)[0]]]) if ((ks)[0]) in (m) else _dafny.SeqWithoutIsStrInference([])))
                    in0_ = _dafny.SeqWithoutIsStrInference((ks)[1::])
                    in1_ = m
                    ks = in0_
                    m = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def OMapEnts(ks, m):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(ks)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([]))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([((ks)[0], (m)[(ks)[0]])]) if ((ks)[0]) in (m) else _dafny.SeqWithoutIsStrInference([])))
                    in0_ = _dafny.SeqWithoutIsStrInference((ks)[1::])
                    in1_ = m
                    ks = in0_
                    m = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def OMapValues(o):
        return default__.OMapVals((o).keys, (o).m)

    @staticmethod
    def OMapEntries(o):
        return default__.OMapEnts((o).keys, (o).m)

    @staticmethod
    def OMapFrom(o, es):
        while True:
            with _dafny.label():
                if (len(es)) == (0):
                    return o
                elif True:
                    in0_ = default__.OMapPut(o, ((es)[0])[0], ((es)[0])[1])
                    in1_ = _dafny.SeqWithoutIsStrInference((es)[1::])
                    o = in0_
                    es = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def DictDigits(s):
        return ((len(s)) == (0)) or ((((_dafny.CodePoint('0')) <= ((s)[0])) and (((s)[0]) <= (_dafny.CodePoint('9')))) and (default__.DictDigits(_dafny.SeqWithoutIsStrInference((s)[1::]))))

    @staticmethod
    def DictValue(s, acc):
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return acc
                elif True:
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = ((acc) * (10)) + ((ord((s)[0])) - (ord(_dafny.CodePoint('0'))))
                    s = in0_
                    acc = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def DictIndex(s):
        return (((((0) < (len(s))) and ((len(s)) <= (10))) and (default__.DictDigits(s))) and ((((s)[0]) != (_dafny.CodePoint('0'))) or ((len(s)) == (1)))) and ((default__.DictValue(s, 0)) <= (4294967294))

    @staticmethod
    def DictBefore(k, x):
        return (default__.DictIndex(k)) and ((not(default__.DictIndex(x))) or ((default__.DictValue(k, 0)) < (default__.DictValue(x, 0))))

    @staticmethod
    def DictIns(k, xs):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(xs)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([k]))
                elif default__.DictBefore(k, (xs)[0]):
                    return (d_0___accumulator_) + ((_dafny.SeqWithoutIsStrInference([k])) + (xs))
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference([(xs)[0]]))
                    in0_ = k
                    in1_ = _dafny.SeqWithoutIsStrInference((xs)[1::])
                    k = in0_
                    xs = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def DictPut(o, k, v):
        if (k) in ((o).m):
            return OMap_OMap((o).keys, ((o).m).set(k, v))
        elif True:
            return OMap_OMap(default__.DictIns(k, (o).keys), ((o).m).set(k, v))

    @staticmethod
    def DictFrom(o, es):
        while True:
            with _dafny.label():
                if (len(es)) == (0):
                    return o
                elif True:
                    in0_ = default__.DictPut(o, ((es)[0])[0], ((es)[0])[1])
                    in1_ = _dafny.SeqWithoutIsStrInference((es)[1::])
                    o = in0_
                    es = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def DictMerge(o, src):
        return default__.DictFrom(o, default__.OMapEntries(src))

    @staticmethod
    def Join__string(s, sep):
        d_0___accumulator_ = _dafny.SeqWithoutIsStrInference([])
        while True:
            with _dafny.label():
                if (len(s)) == (0):
                    return (d_0___accumulator_) + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "")))
                elif (len(s)) == (1):
                    return (d_0___accumulator_) + ((s)[0])
                elif True:
                    d_0___accumulator_ = (d_0___accumulator_) + (((s)[0]) + (sep))
                    in0_ = _dafny.SeqWithoutIsStrInference((s)[1::])
                    in1_ = sep
                    s = in0_
                    sep = in1_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def key__order__loop0(seq0, idx0, d):
        while True:
            with _dafny.label():
                pat_let_tv0_ = d
                pat_let_tv1_ = d
                pat_let_tv2_ = d
                if (idx0) >= (len(seq0)):
                    return d
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    def iife0_(_pat_let0_0):
                        def iife1_(d_2_pk0___):
                            return (pat_let_tv0_ if ((d_2_pk0___) == (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__proto__")))) and ((d_2_pk0___) not in ((pat_let_tv1_).m)) else default__.DictPut(pat_let_tv2_, d_2_pk0___, d_0_x_))
                        return iife1_(_pat_let0_0)
                    d_1_d_ = iife0_(d_0_x_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_d_
                    seq0 = in0_
                    idx0 = in1_
                    d = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def key__order(xs):
        def iife0_(_pat_let1_0):
            def iife1_(d_1_m0_):
                return d_1_m0_
            return iife1_(_pat_let1_0)
        d_0_d_ = iife0_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        d_2_d_ = default__.key__order__loop0(xs, 0, d_0_d_)
        return default__.Join__string((d_2_d_).keys, _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, ",")))

    @staticmethod
    def reinsert__order__loop0(seq0, idx0, d):
        while True:
            with _dafny.label():
                pat_let_tv0_ = d
                pat_let_tv1_ = d
                pat_let_tv2_ = d
                if (idx0) >= (len(seq0)):
                    return d
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    def iife0_(_pat_let2_0):
                        def iife1_(d_2_pk0___):
                            return (pat_let_tv0_ if ((d_2_pk0___) == (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__proto__")))) and ((d_2_pk0___) not in ((pat_let_tv1_).m)) else default__.DictPut(pat_let_tv2_, d_2_pk0___, d_0_x_))
                        return iife1_(_pat_let2_0)
                    d_1_d_ = iife0_(d_0_x_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_d_
                    seq0 = in0_
                    idx0 = in1_
                    d = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def reinsert__order__loop1(seq1, idx1, out):
        while True:
            with _dafny.label():
                if (idx1) >= (len(seq1)):
                    return out
                elif True:
                    d_0_k_ = (seq1)[idx1]
                    d_1_out_ = ((out) + (d_0_k_)) + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, ";")))
                    in0_ = seq1
                    in1_ = (idx1) + (1)
                    in2_ = d_1_out_
                    seq1 = in0_
                    idx1 = in1_
                    out = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def reinsert__order(xs):
        def iife0_(_pat_let3_0):
            def iife1_(d_1_m0_):
                return d_1_m0_
            return iife1_(_pat_let3_0)
        d_0_d_ = iife0_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        d_2_d_ = default__.reinsert__order__loop0(xs, 0, d_0_d_)
        d_3_d_ = default__.OMapDel(d_2_d_, _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a")))
        d_4_d_ = default__.DictPut(d_3_d_, _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "z")))
        d_5_out_ = _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, ""))
        d_6_out_ = default__.reinsert__order__loop1((d_4_d_).keys, 0, d_5_out_)
        return (d_6_out_) + (default__.Join__string(default__.OMapValues(d_4_d_), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, ","))))

    @staticmethod
    def spread__order__loop0(seq0, idx0, src):
        while True:
            with _dafny.label():
                pat_let_tv0_ = src
                pat_let_tv1_ = src
                pat_let_tv2_ = src
                if (idx0) >= (len(seq0)):
                    return src
                elif True:
                    d_0_x_ = (seq0)[idx0]
                    def iife0_(_pat_let4_0):
                        def iife1_(d_2_pk0___):
                            return (pat_let_tv0_ if ((d_2_pk0___) == (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__proto__")))) and ((d_2_pk0___) not in ((pat_let_tv1_).m)) else default__.DictPut(pat_let_tv2_, d_2_pk0___, (d_0_x_) + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "!")))))
                        return iife1_(_pat_let4_0)
                    d_1_src_ = iife0_(d_0_x_)
                    in0_ = seq0
                    in1_ = (idx0) + (1)
                    in2_ = d_1_src_
                    seq0 = in0_
                    idx0 = in1_
                    src = in2_
                    raise _dafny.TailCall()
                break

    @staticmethod
    def spread__order(xs):
        def iife0_(_pat_let5_0):
            def iife1_(d_1_m0_):
                return d_1_m0_
            return iife1_(_pat_let5_0)
        d_0_src_ = iife0_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        d_2_src_ = default__.spread__order__loop0(xs, 0, d_0_src_)
        def iife2_(_pat_let6_0):
            def iife3_(d_4_m0_):
                return d_4_m0_
            return iife3_(_pat_let6_0)
        d_3_d_ = default__.DictPut(default__.DictMerge(default__.DictPut(iife2_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({}))), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "b")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "b"))), d_2_src_), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a")))
        return default__.Join__string(default__.OMapValues(d_3_d_), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, ",")))

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print((default__.reinsert__order(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "b")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "2")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "a")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "10")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "9"))]))).VerbatimString(False))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print((default__.reinsert__order(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "x")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "1")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "x")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "0"))]))).VerbatimString(False))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print((default__.reinsert__order(_dafny.SeqWithoutIsStrInference([_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "01")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "1")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "4294967295")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "4294967294")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "-1"))]))).VerbatimString(False))
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


class OMap:
    @classmethod
    def default(cls, ):
        return lambda: OMap_OMap(_dafny.Seq({}), _dafny.Map({}))
    def __ne__(self, __o: object) -> bool:
        return not self.__eq__(__o)
    @property
    def is_OMap(self) -> bool:
        return isinstance(self, OMap_OMap)

class OMap_OMap(OMap, NamedTuple('OMap', [('keys', Any), ('m', Any)])):
    def __dafnystr__(self) -> str:
        return f'OMap.OMap({_dafny.string_of(self.keys)}, {_dafny.string_of(self.m)})'
    def __eq__(self, __o: object) -> bool:
        return isinstance(__o, OMap_OMap) and self.keys == __o.keys and self.m == __o.m
    def __hash__(self) -> int:
        return super().__hash__()

