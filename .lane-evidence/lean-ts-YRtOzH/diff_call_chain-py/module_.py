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
    def double(x):
        return (x) + (x)

    @staticmethod
    def quad(x):
        return default__.double(default__.double(x))

    @staticmethod
    def add__big(a, b):
        return (a) + (b)

    @staticmethod
    def Main(noArgsParameter__):
        _dafny.print(_dafny.string_of(default__.quad(3)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))
        _dafny.print(_dafny.string_of(default__.quad(-2)))
        _dafny.print((_dafny.SeqWithoutIsStrInference(map(_dafny.CodePoint, "\n"))).VerbatimString(False))

