// A reply from a language model is an outside call; what the code does with the reply is the code under test.
export interface Model { complete(prompt: string): string }

export function askUntilOk(model: Model, prompt: string, tries: number): string {
  for (let i = 0; i < tries; i++) {
    const reply = model.complete(prompt);
    if (reply.startsWith("OK")) return reply;
  }
  return "";
}

export function label(reply: string): string {
  return reply.startsWith("OK") ? "ok" : "text";
}
