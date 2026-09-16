export const QUOTE_PRESETS: Record<string, string[]> = {
  Plumber: ["Call-out fee", "Parts", "Labour", "Waste removal"],
  Electrician: ["Site visit", "Materials", "Labour", "Certification"],
  Welder: ["Fabrication", "Installation", "Paint / finish", "Transport"],
  Carpenter: ["Design", "Timber", "Joinery labour", "Installation"],
  Mechanic: ["Diagnostics", "Parts", "Labour", "Road test"],
  Painter: ["Prep work", "Paint", "Labour", "Cleanup"],
  Builder: ["Site prep", "Materials", "Labour", "Finishing"],
  Photographer: ["Session fee", "Editing", "Prints", "Travel"],
  Caterer: ["Menu cost", "Service staff", "Equipment", "Delivery"],
  Decorator: ["Consultation", "Drapes / linens", "Setup", "Teardown"],
  "Event supplier": ["Equipment rental", "Delivery", "Setup", "Collection"],
  "IT technician": ["Diagnostics", "Hardware", "Configuration", "Support"],
  "Graphic designer": ["Concept", "Design", "Revisions", "Final files"],
  "Web developer": ["Discovery", "Development", "Testing", "Deployment"],
  Cleaning: ["Inspection", "Supplies", "Labour", "Follow-up"],
  "AC technician": ["Diagnostics", "Gas / parts", "Labour", "Service"],
  "Appliance repair": ["Diagnostics", "Parts", "Labour", "Warranty"],
};

export function getPresetsForTrade(tradeType: string | null | undefined): string[] {
  if (!tradeType) return [];
  if (tradeType.startsWith("other:")) return [];
  return QUOTE_PRESETS[tradeType] ?? [];
}
