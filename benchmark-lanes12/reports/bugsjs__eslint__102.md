# lean report: 3c1dd6d8d3391b3568d6452e11d3d1336c629d5e → 8f85cbe579117913bf9827762ba92a0af5ab5ae4

Identity: 5ac7f9543099231a0c3d3c365b455cbfe2b015ad77f95c236e8289509b4b7acb; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 1 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/plugins.js | `Plugins.loadAll` (161-174) | **PASS-bounded** | refused:unresolved-module | PASS-bounded |  | TS2304: Cannot find name 'Environments'. |
| lib/config/plugins.js | `(edit 8e1d4fcbe552)` (159-159) | **ASK** | unassigned:module-level statement |  |  | module-level statement |

## What would make the asks provable

### lib/config/plugins.js · `Plugins.loadAll`

- line 31, `unresolved-module`: TS2304: Cannot find name 'Environments'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 32, `unresolved-module`: TS2304: Cannot find name 'Rules'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 55, `ts-strict`: TS2531: Object is possibly 'null'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 119, `ts-strict`: TS2339: Property 'messageTemplate' does not exist on type 'Error'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 120, `ts-strict`: TS2339: Property 'messageData' does not exist on type 'Error'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 133, `unresolved-module`: TS2591: Cannot find name 'require'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 173, `foreach`: forEach runs a callback for its effects; write `for (const x of xs)` so the state comes out of the loop, or pass an arrow with one parameter
  do: [migration] Write `for (const x of xs) { ... }`; a loop may update a local, a callback may not.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 12 = 11 unit + 0 artifact + 1 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 8e1d4fcbe5521c7d09f9b41fad2ee3d73b59b979291c9c29727d5938722bba49 | lib/config/plugins.js | text | 158+0 | 159+1 | unassigned: module-level statement |  |
| 1eab96d077d291f64fdf2610cc43b8a8ad716c779a259c41feb7c0afd95b9041 | lib/config/plugins.js | text | 160+0 | 162+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 34acaedd59531ad57946bef5904d33d937dd5f90de9a495474dcf1b810d5df67 | lib/config/plugins.js | text | 160+0 | 163+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 60033b2b8cebe030c1537cc92bce3a0e69fac70fd60ed43d7012e88f81a09085 | lib/config/plugins.js | text | 160+0 | 164+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 0dc922df8c702a22f70e2685d2270fdfbd61de1048fb81631fc4e65ccff30631 | lib/config/plugins.js | text | 160+0 | 165+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| ab80d98d94d18b9917b758b230911caf50b387a133ba8305aa32f3927eaf6081 | lib/config/plugins.js | text | 160+0 | 166+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 5beb989b1e3a2ba2eb8353e4f2b759f19b2a38b585d2ff4cde743213935670ad | lib/config/plugins.js | text | 160+0 | 167+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 8382a23c4a757dde7b61427178d0a60c0e55813738340a3de4a542e77a89db55 | lib/config/plugins.js | text | 160+0 | 168+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 1eebde45190d6c8083ac5ce7643d5501d098e04de4c530d90e6d9326aa67ce25 | lib/config/plugins.js | text | 160+0 | 169+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 0e6815ccef93bcba317d7a0ee1f7fdfb1a09b4a81d262aa8f853e7096eea215c | lib/config/plugins.js | text | 160+0 | 170+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 0e33b4654ff9c3706b0519fa05138f1566bd4390a9e958daadd95ac3f74d93a9 | lib/config/plugins.js | text | 160+0 | 171+1 | unit: Plugins.loadAll | new:Plugins.loadAll |
| 53dc0db66586770acbec8129269fd5df333c1b69bb06c7d44196708a4c8993d4 | lib/config/plugins.js | text | 160+0 | 172+1 | unit: Plugins.loadAll | new:Plugins.loadAll |

source: {"unit":["1eab96d077d291f64fdf2610cc43b8a8ad716c779a259c41feb7c0afd95b9041","34acaedd59531ad57946bef5904d33d937dd5f90de9a495474dcf1b810d5df67","60033b2b8cebe030c1537cc92bce3a0e69fac70fd60ed43d7012e88f81a09085","0dc922df8c702a22f70e2685d2270fdfbd61de1048fb81631fc4e65ccff30631","ab80d98d94d18b9917b758b230911caf50b387a133ba8305aa32f3927eaf6081","5beb989b1e3a2ba2eb8353e4f2b759f19b2a38b585d2ff4cde743213935670ad","8382a23c4a757dde7b61427178d0a60c0e55813738340a3de4a542e77a89db55","1eebde45190d6c8083ac5ce7643d5501d098e04de4c530d90e6d9326aa67ce25","0e6815ccef93bcba317d7a0ee1f7fdfb1a09b4a81d262aa8f853e7096eea215c","0e33b4654ff9c3706b0519fa05138f1566bd4390a9e958daadd95ac3f74d93a9","53dc0db66586770acbec8129269fd5df333c1b69bb06c7d44196708a4c8993d4"],"artifact":[],"unassigned":["8e1d4fcbe5521c7d09f9b41fad2ee3d73b59b979291c9c29727d5938722bba49"]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__102/run-I8eguh/terminal.json