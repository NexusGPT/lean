lemma RealCases() {
  assert fraction("x") == "xab";
  assert negative("abc") == "a";
  assert StrLast_string("a", "a", 0) == 0;
  assert StrLast_string("a", "a", 1) == 0;
  assert pos("a") == 0.0;
  assert decimal() == "1e+21:0.1:0";
}
