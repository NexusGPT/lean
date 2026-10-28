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
    def headers__for(token, json):
        def iife0_(_pat_let0_0):
            def iife1_(d_1_m0_):
                return d_1_m0_
            return iife1_(_pat_let0_0)
        d_0_headers_ = iife0_(OMap_OMap(_dafny.SeqWithoutIsStrInference([]), _dafny.Map({})))
        def iife2_(_pat_let1_0):
            def iife3_(d_3_headers_):
                return d_3_headers_
            return iife3_(_pat_let1_0)
        d_2_headers_ = (iife2_(default__.DictPut(d_0_headers_, _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "Authorization")), (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "Bearer "))) + (token))) if (token) != (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, ""))) else d_0_headers_)
        def iife4_(_pat_let2_0):
            def iife5_(d_5_headers_):
                return d_5_headers_
            return iife5_(_pat_let2_0)
        d_4_headers_ = (iife4_(default__.DictPut(d_2_headers_, _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "Content-Type")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "application/json")))) if json else d_2_headers_)
        return d_4_headers_

    @staticmethod
    def has__auth(token):
        d_0_h_ = default__.headers__for(token, True)
        return not((False if (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "Authorization"))) in ((d_0_h_).m) else (True) and (not((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "Authorization"))) in (default__.ObjectProtoNames__)))))

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.has__auth(_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "abc")))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.has__auth(_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "")))))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))

    @_dafny.classproperty
    def ObjectProtoNames__(instance):
        return _dafny.Set({_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__defineGetter__")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__defineSetter__")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__lookupGetter__")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__lookupSetter__")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "__proto__")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "constructor")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "hasOwnProperty")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "isPrototypeOf")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "propertyIsEnumerable")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "toLocaleString")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "toString")), _dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "valueOf"))})

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

