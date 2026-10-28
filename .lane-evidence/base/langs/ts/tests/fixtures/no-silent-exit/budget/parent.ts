// records nested twelve deep under long field names: the generated path of the innermost handle outgrows the fake
// path budget of 400 characters, so the inputs cannot be built (ASK budget, never a silent exit)
interface Handle { open(): void }
type L12 = { innermostHandle: Handle };
type L11 = { levelNumber11OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L12 };
type L10 = { levelNumber10OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L11 };
type L9 = { levelNumber9OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L10 };
type L8 = { levelNumber8OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L9 };
type L7 = { levelNumber7OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L8 };
type L6 = { levelNumber6OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L7 };
type L5 = { levelNumber5OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L6 };
type L4 = { levelNumber4OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L5 };
type L3 = { levelNumber3OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L4 };
type L2 = { levelNumber2OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L3 };
type L1 = { levelNumber1OfTheSettingsRecordWithADeliberatelyLongDescriptiveFieldName: L2 };
export const readSettings = (settings: L1): boolean => settings !== undefined;
