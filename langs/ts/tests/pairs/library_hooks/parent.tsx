import { useQuery } from "@tanstack/react-query";
import { fetchStatus } from "./status-api";
// the hook table (moonshot 8): useQuery is a typed transition of the world, its result the table's record
export function Status(props: { id: string }) {
  const { data, isPending, isError } = useQuery({ queryKey: ["status", props.id], queryFn: () => fetchStatus(props.id) });
  if (isPending) return <p>loading</p>;
  if (isError) return <p>failed</p>;
  return <p>{String(data)}</p>;
}
export function Tag(props: { id: string }) {
  const q = useQuery({ queryKey: ["label", props.id], queryFn: () => fetchStatus(props.id) });
  return <span>{q.status}</span>;
}
