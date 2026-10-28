import json,re
from pathlib import Path
root=Path(__file__).resolve().parent

def read(name):
    text=(root/name).read_text()
    rows={}
    for line in text.splitlines():
        p=[x.strip() for x in line.split("|")]
        if len(p)>=7 and p[4] in ("PASS","FAIL"):
            rows[tuple(p[1:4])]={"status":p[4],"detail":"|".join(p[6:]).strip()}
    total=re.findall(r"^\| TOTAL \| (\d+) checks \| (.*?) \|$",text,re.M)
    exits=re.findall(r"^EXIT (-?\d+)$",text,re.M)
    detector=[l for l in text.splitlines() if l.startswith("| PROOF-HUNT TOTAL |")]
    return {"total":total,"exit":exits,"detector":detector,"rows":rows}

before=read("before-full.log");after=read("after-full.log")
if not before["total"] or not after["total"]:raise SystemExit("full suite tables not complete")
b=before.pop("rows");a=after.pop("rows")
result={
 "before":before,"after":after,
 "status_changes":[{"check":k,"before":v,"after":a.get(k)} for k,v in b.items() if k not in a or v["status"]!=a[k]["status"]],
 "added":[{"check":k,**v} for k,v in a.items() if k not in b],
 "before_failures":[{"check":k,**v} for k,v in b.items() if v["status"]=="FAIL"],
 "after_failures":[{"check":k,**v} for k,v in a.items() if v["status"]=="FAIL"],
 "before_pair_checks":sum(k[0]=="pair" for k in b),
 "after_pair_checks":sum(k[0]=="pair" for k in a),
}
(root/"suite-comparison.json").write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps(result,indent=2))
