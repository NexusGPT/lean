import json
from pathlib import Path
r=Path(__file__).resolve().parent
for label,tmp,source in [("before","lean-ts-YRtOzH",r/"base"),("after","lean-ts-nqeyQF",r.parent)]:
    dirs=sorted((r/tmp).glob("pair_*"))
    mismatches=[]; checked=0
    for d in dirs:
        name=d.name.removeprefix("pair_")
        exp=json.loads((source/"langs/ts/tests/pairs"/name/"expect.json").read_text())
        for unit,want in exp.get("b",{}).items():
            f=d/f"b_{unit}.json"
            if not f.exists():continue
            try:got=json.loads(f.read_text())
            except json.JSONDecodeError:continue
            checked+=1
            if got.get("verdict")!=want:mismatches.append({"pair":name,"unit":unit,"want":want,"got":got.get("verdict"),"reason":got.get("reason")})
    print(json.dumps({"run":label,"pair_directories":len(dirs),"current":dirs[-1].name if dirs else None,"completed_B":checked,"mismatches":mismatches}))
    log=(r/f"{label}-full.log").read_text()
    if log:print(log[-1200:])
