// a user holds a reference to tags; arguments may share that reference
// parent: user.tags = [...user.tags, "new"]; return user.tags.length;
// candidate: tags.push("new"); return user.tags.length;
// the call passes addTag(user, user.tags)
type Ref = nat
datatype Obj = User(tags: Ref) | Tags(items: seq<string>)
datatype World = World(heap: map<Ref, Obj>, next: nat)
datatype Answer = Answer(world: World, result: nat)

predicate Valid(w: World, user: Ref, tags: Ref) {
  user in w.heap && w.heap[user].User? &&
  tags in w.heap && w.heap[tags].Tags? && w.heap[user].tags == tags &&
  (forall r :: r in w.heap ==> r < w.next)
}

function Append(w: World, tags: Ref): World
  requires tags in w.heap && w.heap[tags].Tags?
{
  World(w.heap[tags := Tags(w.heap[tags].items + ["new"])], w.next)
}

function AllocateTags(w: World, xs: seq<string>): (World, Ref)
  requires forall r :: r in w.heap ==> r < w.next
  ensures AllocateTags(w, xs).1 !in w.heap
  ensures AllocateTags(w, xs).0.next == w.next + 1
{
  (World(w.heap[w.next := Tags(xs)], w.next + 1), w.next)
}

function AddTagParent(w: World, user: Ref, tags: Ref): Answer
  requires Valid(w, user, tags)
{
  var prior :=  w.heap[user].tags;
  var (allocatedWorld, freshRef) := AllocateTags(w, w.heap[prior].items + ["new"]);
  var final := World(allocatedWorld.heap[user := User(freshRef)], allocatedWorld.next);
  Answer(final, |final.heap[freshRef].items|)
}

function AddTagCandidate(w: World, user: Ref, tags: Ref): Answer
  requires Valid(w, user, tags)
{
  var final := Append(w, tags);
  Answer(final, |final.heap[final.heap[user].tags].items|)
}

function AddTagRefactor(w: World, user: Ref, tags: Ref): Answer
  requires Valid(w, user, tags)
{
  var alias := w.heap[user].tags;
  var xs := w.heap[alias].items;
  var (allocatedWorld, freshRef) := AllocateTags(w, xs + ["new"]);
  Answer(World(allocatedWorld.heap[user := User(freshRef)], allocatedWorld.next), |xs| + 1)
}

// a refactor of mutation through a path into mutation through an alias
function PushDirect(w: World, user: Ref, tags: Ref): World
  requires Valid(w, user, tags)
{ Append(w, w.heap[user].tags) }

lemma AliasRefactorEqual(w: World, user: Ref, tags: Ref)
  requires Valid(w, user, tags)
  ensures PushDirect(w, user, tags) == Append(w, tags)
{}

// canonical allocation order makes the fresh-reference bijection the identity
lemma FreshRefactorEqual(w: World, user: Ref, tags: Ref)
  requires Valid(w, user, tags)
  ensures AddTagParent(w, user, tags) == AddTagRefactor(w, user, tags)
  ensures AddTagParent(w, user, tags).world.heap[w.next] == Tags(w.heap[tags].items + ["new"])
{}

// the old tags are observable even after the parent's user stops pointing at them
lemma AliasingPairDifferent(w: World, user: Ref, tags: Ref)
  requires Valid(w, user, tags)
  ensures AddTagParent(w, user, tags).result == AddTagCandidate(w, user, tags).result
  ensures AddTagParent(w, user, tags).world.heap[tags] != AddTagCandidate(w, user, tags).world.heap[tags]
  ensures AddTagParent(w, user, tags) != AddTagCandidate(w, user, tags)
{}

// distinct shapes exclude user == tags; this is not a distinct-parameter axiom
lemma Witness()
  ensures Valid(World(map[0 := User(1), 1 := Tags([])], 2), 0, 1)
  ensures AddTagParent(World(map[0 := User(1), 1 := Tags([])], 2), 0, 1) !=
          AddTagCandidate(World(map[0 := User(1), 1 := Tags([])], 2), 0, 1)
{
  AliasingPairDifferent(World(map[0 := User(1), 1 := Tags([])], 2), 0, 1);
}
