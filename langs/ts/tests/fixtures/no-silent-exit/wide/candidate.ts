// a record of 40 string fields and a service handle: the heap enumerator's shape key (the field list) runs past the
// fake path budget, so a generated field's path names its shape by index, and the unit gets a verdict, never ASK budget
interface Handle { open(): void }
type Wide = {
  settingNumber00OfTheWideRecord: string;
  settingNumber01OfTheWideRecord: string;
  settingNumber02OfTheWideRecord: string;
  settingNumber03OfTheWideRecord: string;
  settingNumber04OfTheWideRecord: string;
  settingNumber05OfTheWideRecord: string;
  settingNumber06OfTheWideRecord: string;
  settingNumber07OfTheWideRecord: string;
  settingNumber08OfTheWideRecord: string;
  settingNumber09OfTheWideRecord: string;
  settingNumber10OfTheWideRecord: string;
  settingNumber11OfTheWideRecord: string;
  settingNumber12OfTheWideRecord: string;
  settingNumber13OfTheWideRecord: string;
  settingNumber14OfTheWideRecord: string;
  settingNumber15OfTheWideRecord: string;
  settingNumber16OfTheWideRecord: string;
  settingNumber17OfTheWideRecord: string;
  settingNumber18OfTheWideRecord: string;
  settingNumber19OfTheWideRecord: string;
  settingNumber20OfTheWideRecord: string;
  settingNumber21OfTheWideRecord: string;
  settingNumber22OfTheWideRecord: string;
  settingNumber23OfTheWideRecord: string;
  settingNumber24OfTheWideRecord: string;
  settingNumber25OfTheWideRecord: string;
  settingNumber26OfTheWideRecord: string;
  settingNumber27OfTheWideRecord: string;
  settingNumber28OfTheWideRecord: string;
  settingNumber29OfTheWideRecord: string;
  settingNumber30OfTheWideRecord: string;
  settingNumber31OfTheWideRecord: string;
  settingNumber32OfTheWideRecord: string;
  settingNumber33OfTheWideRecord: string;
  settingNumber34OfTheWideRecord: string;
  settingNumber35OfTheWideRecord: string;
  settingNumber36OfTheWideRecord: string;
  settingNumber37OfTheWideRecord: string;
  settingNumber38OfTheWideRecord: string;
  settingNumber39OfTheWideRecord: string;
  handle: Handle;
};
export const firstSetting = (wide: Wide): string => wide.settingNumber00OfTheWideRecord;
