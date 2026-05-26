/** Default claim values per configuration (aligned with mock CSV / Postman). */
export const FARMER_SAMPLE_CLAIMS: Record<string, string> = {
  id: "PERSON-001",
  fullName: "Rajesh Kumar",
  mobileNumber: "9876543210",
  dateOfBirth: "1990-05-15",
  gender: "Male",
  state: "Maharashtra",
  district: "Pune",
  villageOrTown: "Baramati",
  postalCode: "413102",
  landArea: "2.5 acres",
  landOwnershipType: "Owned",
  primaryCropType: "Soybean",
  secondaryCropType: "Wheat",
  farmerID: "FARM-2024-001",
};

export const PERSON_SAMPLE_CLAIMS: Record<string, string> = {
  id: "PERSON-001",
  fullName: "Ada Lovelace",
  dateOfBirth: "1815-12-10",
  gender: "Female",
  email: "ada@example.local",
};

/** Matches certify.records sample rows (HEALTH-001 / HEALTH-003). */
export const HEALTH_ID_SAMPLE_CLAIMS: Record<string, string> = {
  id: "HEALTH-003",
  firstName: "Shailesh",
  lastName: "Gojiya",
  dateOfBirth: "1815-12-10",
  gender: "Female",
  email: "shailesh.gojiya@viitor.cloud",
  phoneNumber: "+919876543210",
};

export function sampleClaimsForConfig(
  configId: string,
  displayOrder?: string[],
): Record<string, string> {
  if (configId === "FarmerCredential") return { ...FARMER_SAMPLE_CLAIMS };
  if (configId === "PersonCredential") return { ...PERSON_SAMPLE_CLAIMS };
  if (configId === "HealthID") return { ...HEALTH_ID_SAMPLE_CLAIMS };

  const keys = displayOrder?.length ? ["id", "personId", ...displayOrder] : ["id", "fullName"];
  const unique = [...new Set(keys)];
  return Object.fromEntries(unique.map((k) => [k, ""]));
}
