// a record with many fields whose last field is a table of tables of handles: the generated path of the innermost
// handle outgrows the input generator's budget, so the inputs cannot be built
interface Handle { open(): void }
type Settings = {
  descriptiveSettingNumber0OfTheRecordUnderTest: string;
  descriptiveSettingNumber1OfTheRecordUnderTest: string;
  descriptiveSettingNumber2OfTheRecordUnderTest: string;
  descriptiveSettingNumber3OfTheRecordUnderTest: string;
  descriptiveSettingNumber4OfTheRecordUnderTest: string;
  descriptiveSettingNumber5OfTheRecordUnderTest: string;
  descriptiveSettingNumber6OfTheRecordUnderTest: string;
  descriptiveSettingNumber7OfTheRecordUnderTest: string;
  descriptiveSettingNumber8OfTheRecordUnderTest: string;
  descriptiveSettingNumber9OfTheRecordUnderTest: string;
  descriptiveSettingNumber10OfTheRecordUnderTest: string;
  descriptiveSettingNumber11OfTheRecordUnderTest: string;
  tableOfSettingsGroupsKeyedByTheirLongDescriptiveName: Record<string, Record<string, { innermostHandleOfTheSettingsGroupEntry: Handle }>>;
};
export const readSettings = (settings: Settings): boolean => settings.descriptiveSettingNumber0OfTheRecordUnderTest !== '';
