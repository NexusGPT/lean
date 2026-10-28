lemma {:fuel TrimStart_string, 6, 7} {:fuel TrimEnd_string, 6, 7} CheckTrim()
{
  assert StrSpace_char('\U{FEFF}');
  assert StrSpace_char('\U{2007}');
  assert !StrSpace_char('\U{0085}') && !StrSpace_char('\U{180E}') && !StrSpace_char('\U{200B}');
  assert TrimStart_string("  a ") == "a ";
  assert TrimEnd_string(" a  ") == " a";
  assert Trim_string("  a ") == "a";
  assert trimmed("\U{00A0}a\U{2028}") == "a";
  assert trimmed("") == "" && trimmed(" \t\n") == "";
}
lemma {:fuel AsciiLower_string, 6, 7} {:fuel AsciiUpper_string, 6, 7} CheckCase()
{
  assert ('\U{00C9}' as int) == 201 && ('\U{00DF}' as int) == 223;
  assert '\U{00C9}' in "\U{00C9}" && '\U{00DF}' in "\U{00DF}";
  assert !IsAscii_string("\U{00DF}");
  assert IsAscii_string("Az0!") && !IsAscii_string("\U{00C9}");
  assert AsciiLower_string("Az0!") == "az0!";
  assert AsciiUpper_string("aZ0!") == "AZ0!";
  assert Lower_string("AZ") == "az" && Upper_string("az") == "AZ";
  assert lower("\U{00C9}") == ext_str_toLowerCase_string("\U{00C9}");
  assert upper("\U{00DF}") == ext_str_toUpperCase_string("\U{00DF}");
}
lemma {:isolate_assertions} {:fuel StrFind_string, 4, 5} {:fuel StrSplit_string, 4, 5} CheckSplit()
{
  assert 'a' != 'b' && 'a' != 'z' && 'a' != ',';
  assert "aba"[1..2] == "b" && "b" != "a";
  assert StrFind_string("aba", "a", 2) == 2;
  assert StrFind_string("aba", "a", 1) == 2;
  assert "a" != "z" && "b" != "z";
  assert StrFind_string("ab", "z", 2) == -1;
  assert StrFind_string("ab", "z", 1) == -1;
  assert StrFind_string("ab", "z", 0) == -1;
  assert StrFind_string("", "", 0) == 0;
  assert StrSplit_string("", "") == [];
  assert StrSplit_string("", ",") == [""];
  assert "a" != ",";
  assert StrFind_string("a,,", ",", 1) == 1;
  assert StrFind_string("a,,", ",", 0) == 1;
  assert StrSplit_string(",", ",") == ["", ""];
  assert "a,,"[..1] == "a" && "a,,"[2..] == ",";
  assert StrSplit_string("a,,", ",") == ["a", "", ""];
  assert StrSplit_string(",a,,", ",") == ["", "a", "", ""];
  assert StrSplit_string("aaa", "aa") == ["", "a"];
  assert chars("a\U{00E9}") == ["a", "\U{00E9}"];
}
lemma CheckPad()
{
  assert PadFill_string("ab", 5) == "ababa";
  assert PadStart_string("x", 4, "ab") == "abax";
  assert PadEnd_string("x", 4, "ab") == "xaba";
  assert pad_left("x", -2, "0") == "x";
  assert pad_right("x", 9, "") == "x";
  assert pad_left("long", 2, "0") == "long";
}
lemma {:fuel StrSubstitution_string, 4, 5} {:fuel StrFind_string, 4, 5} {:fuel StrReplace_string, 4, 5} CheckReplace()
{
  assert 'a' != 'b' && 'a' != 'z' && 'a' != ',';
  assert StrSubstitution_string("cat", 1, 1, "$$") == "$";
  assert StrSubstitution_string("cat", 1, 1, "$&") == "a";
  assert StrSubstitution_string("cat", 1, 1, "$`") == "c";
  assert StrSubstitution_string("cat", 1, 1, "$'") == "t";
  assert StrSubstitution_string("cat", 1, 1, "$1") == "$1";
  assert replace("aba", "x") == "xba";
  assert "aba"[1..2] == "b" && "b" != "a";
  assert StrFind_string("aba", "a", 2) == 2;
  assert StrFind_string("aba", "a", 1) == 2;
  assert StrReplace_string("aba", "a", "x", 1, true) == "bx";
  assert replace_all("aba", "x") == "xbx";
  assert replace_all("aba", "$`") == "bab";
  assert replace_all("aba", "$'") == "bab";
  assert StrReplace_string("aba", "a", "$$", 1, true) == "b$";
  assert replace_all("aba", "$$") == "$b$";
  assert replace_empty("ab", "-") == "-a-b-";
  assert replace_empty("", "-") == "-";
  assert StrReplace_string("aaa", "aa", "x", 0, true) == "xa";
  assert StrReplace_string("b", "a", "x", 0, true) == "b";
}
lemma {:fuel StrLast_string, 4, 5} CheckLastEnds()
{
  assert 'a' != 'b' && 'a' != 'z' && 'a' != ',';
  assert StrClamp_int(-1, 3) == 0 && StrClamp_int(8, 3) == 3;
  assert StrLast_string("aba", "a", 2) == 2;
  assert "aba"[1..2] == "b" && "b" != "a";
  assert StrLast_string("aba", "a", 0) == 0;
  assert StrLast_string("aba", "a", 1) == 0;
  assert last("aba", 1) == 0 && last("aba", -3) == 0;
  assert last("bbb", 3) == -1;
  assert last_empty("ab", 9) == 2 && last_empty("ab", -9) == 0;
  assert ends("aba", 1) && !ends("aba", 2) && ends("aba", 9);
  assert StrEnds_string("", "", -1);
}
lemma {:fuel StrLt_string, 4, 5} {:fuel Join_string, 4, 5} CheckOrderJoin()
{
  assert StrLt_string("az", "b");
  assert lt("", "a") && !lt("a", "a");
  assert le("a", "a") && ge("a", "a") && gt("b", "az");
  assert lt("\U{00E9}", "\U{FFFF}");
  assert Join_string([], "-") == "";
  assert join(["a", "", "b"]) == "a--b";
  assert index("\U{00E9}") == "\U{00E9}";
  assert text(true) == "42:-7:true" && text(false) == "42:-7:false";
}
lemma {:fuel StrFind_string, 4, 5} CheckPositions()
{
  assert 'a' != 'b' && 'a' != 'z' && 'a' != ',';
  assert StrSubstring_string("abc", 2, 0) == "ab";
  assert substring("abc", -2, 2) == "ab";
  assert StrCharAt_string("abc", -1) == "";
  assert char_at("abc", 3) == "" && char_at("abc", 1) == "b";
  assert StrAt_string("abc", -1) == Some("c");
  assert at("abc", -4) == None;
  assert "aba"[1..2] == "b" && "b" != "a";
  assert StrClamp_int(1, 3) == 1 && StrClamp_int(3, 3) == 3;
  assert StrFind_string("aba", "a", 3) == -1;
  assert StrFind_string("aba", "a", 2) == 2;
  assert StrFind_string("aba", "a", 1) == 2;
  assert index_of("aba", 1) == 2 && !includes("aba", 3);
  assert starts("aba", 2) && !starts("aba", 1);
}
