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
    def JsUint32__int(a):
        return _dafny.euclidian_modulus(a, 4294967296)

    @staticmethod
    def JsSigned__bv32(a):
        d_0_u_ = a
        if (d_0_u_) < (2147483648):
            return d_0_u_
        elif True:
            return (d_0_u_) - (4294967296)

    @staticmethod
    def JsBitAnd__int(a, b):
        d_0_u_ = default__.JsUint32__int(a)
        d_1_v_ = default__.JsUint32__int(b)
        return default__.JsSigned__bv32((d_0_u_) & (d_1_v_))

    @staticmethod
    def JsBitOr__int(a, b):
        d_0_u_ = default__.JsUint32__int(a)
        d_1_v_ = default__.JsUint32__int(b)
        return default__.JsSigned__bv32((d_0_u_) | (d_1_v_))

    @staticmethod
    def JsBitXor__int(a, b):
        d_0_u_ = default__.JsUint32__int(a)
        d_1_v_ = default__.JsUint32__int(b)
        return default__.JsSigned__bv32((d_0_u_) ^ (d_1_v_))

    @staticmethod
    def JsBitNot__int(a):
        d_0_u_ = default__.JsUint32__int(a)
        return default__.JsSigned__bv32((~(d_0_u_)) & ((1 << 32) - 1))

    @staticmethod
    def JsShl__int(a, b):
        d_0_u_ = default__.JsUint32__int(a)
        d_1_k_ = _dafny.euclidian_modulus(default__.JsUint32__int(b), 32)
        return default__.JsSigned__bv32(((d_0_u_) << (d_1_k_)) & ((1 << 32) - 1))

    @staticmethod
    def JsShr__int(a, b):
        d_0_u_ = default__.JsUint32__int(a)
        d_1_k_ = _dafny.euclidian_modulus(default__.JsUint32__int(b), 32)
        return default__.JsSigned__bv32(((d_0_u_) >> (d_1_k_) if (d_0_u_) < (2147483648) else (~(((~(d_0_u_)) & ((1 << 32) - 1)) >> (d_1_k_))) & ((1 << 32) - 1)))

    @staticmethod
    def JsUshr__int(a, b):
        d_0_u_ = default__.JsUint32__int(a)
        d_1_k_ = _dafny.euclidian_modulus(default__.JsUint32__int(b), 32)
        return (d_0_u_) >> (d_1_k_)

    @staticmethod
    def TruncDiv__int(a, b):
        d_0_q_ = _dafny.euclidian_division((a if (a) >= (0) else (0) - (a)), (b if (b) >= (0) else (0) - (b)))
        if ((a) >= (0)) == ((b) >= (0)):
            return d_0_q_
        elif True:
            return (0) - (d_0_q_)

    @staticmethod
    def FloorDiv__int(a, b):
        d_0_q_ = default__.TruncDiv__int(a, b)
        if (((a) - ((b) * (d_0_q_))) != (0)) and (((a) < (0)) != ((b) < (0))):
            return (d_0_q_) - (1)
        elif True:
            return d_0_q_

    @staticmethod
    def and__bits(a, b):
        return default__.JsBitAnd__int(a, b)

    @staticmethod
    def or__bits(a, b):
        return default__.JsBitOr__int(a, b)

    @staticmethod
    def xor__bits(a, b):
        return default__.JsBitXor__int(a, b)

    @staticmethod
    def not__bits(a):
        return default__.JsBitNot__int(a)

    @staticmethod
    def shift__left(a, b):
        return default__.JsShl__int(a, b)

    @staticmethod
    def shift__right(a, b):
        return default__.JsShr__int(a, b)

    @staticmethod
    def shift__unsigned(a, b):
        return default__.JsUshr__int(a, b)

    @staticmethod
    def floor__quotient(a):
        return default__.FloorDiv__int(a, 2)

    @staticmethod
    def trunc__quotient(a):
        return (default__.TruncDiv__int(a, 2)) + (0)

    @staticmethod
    def hex__mask():
        return default__.JsBitAnd__int(4294967295, 2147483648)

    @staticmethod
    def safe__integer():
        return 9007199254740991

    @staticmethod
    def Main(noArgsParameter__):
        if not((default__.and__bits(0, 0)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(133,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(0, 0)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(134,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(0, 0)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(135,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(0)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(136,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(0, 0)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(137,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(0, 0)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(138,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(0, 0)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(139,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(-1, 1)) == (1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(140,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(-1, 1)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(141,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(-1, 1)) == (-2)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(142,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(-1)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(143,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(-1, 1)) == (-2)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(144,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(-1, 1)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(145,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(-1, 1)) == (2147483647)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(146,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(-2147483648, 31)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(147,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(-2147483648, 31)) == (-2147483617)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(148,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(-2147483648, 31)) == (-2147483617)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(149,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(-2147483648)) == (2147483647)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(150,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(-2147483648, 31)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(151,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(-2147483648, 31)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(152,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(-2147483648, 31)) == (1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(153,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(2147483648, 32)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(154,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(2147483648, 32)) == (-2147483616)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(155,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(2147483648, 32)) == (-2147483616)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(156,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(2147483648)) == (2147483647)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(157,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(2147483648, 32)) == (-2147483648)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(158,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(2147483648, 32)) == (-2147483648)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(159,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(2147483648, 32)) == (2147483648)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(160,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(4294967295, 33)) == (33)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(161,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(4294967295, 33)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(162,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(4294967295, 33)) == (-34)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(163,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(4294967295)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(164,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(4294967295, 33)) == (-2)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(165,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(4294967295, 33)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(166,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(4294967295, 33)) == (2147483647)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(167,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(4294967296, -1)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(168,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(4294967296, -1)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(169,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(4294967296, -1)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(170,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(4294967296)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(171,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(4294967296, -1)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(172,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(4294967296, -1)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(173,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(4294967296, -1)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(174,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(-4294967297, 63)) == (63)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(175,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(-4294967297, 63)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(176,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(-4294967297, 63)) == (-64)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(177,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(-4294967297)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(178,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(-4294967297, 63)) == (-2147483648)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(179,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(-4294967297, 63)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(180,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(-4294967297, 63)) == (1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(181,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.and__bits(9007199254740991, 4)) == (4)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(182,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.or__bits(9007199254740991, 4)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(183,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.xor__bits(9007199254740991, 4)) == (-5)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(184,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.not__bits(9007199254740991)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(185,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__left(9007199254740991, 4)) == (-16)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(186,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__right(9007199254740991, 4)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(187,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.shift__unsigned(9007199254740991, 4)) == (268435455)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(188,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(-7)) == (-4)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(189,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(-7)) == (-3)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(190,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(-3)) == (-2)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(191,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(-3)) == (-1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(192,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(0)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(193,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(0)) == (0)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(194,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(3)) == (1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(195,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(3)) == (1)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(196,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.floor__quotient(7)) == (3)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(197,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.trunc__quotient(7)) == (3)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(198,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.hex__mask()) == (-2147483648)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(199,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))
        if not((default__.safe__integer()) == (9007199254740991)):
            raise _dafny.HaltException("/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/.lane-evidence/lean-ts-YRtOzH/number_helpers.dfy(200,2): " + (_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "expectation violation"))).VerbatimString(False))


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

