export interface FHIRResource {
  resourceType: string;
  id?: string;
}

export interface HumanName {
  use?: string;
  family?: string;
  given?: string[];
}

export interface Reference {
  reference?: string;
  display?: string;
}

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Patient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: {
    system?: string;
    value?: string;
    [key: string]: any;
  }[];
  active?: boolean;
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
}

export interface Observation extends FHIRResource {
  resourceType: 'Observation';
  status: string;
  code: CodeableConcept;
  subject?: Reference;
  effectiveDateTime?: string;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
}

export interface ProvenanceAgent {
  type?: CodeableConcept;
  who?: Reference;
}

export interface Provenance extends FHIRResource {
  resourceType: 'Provenance';
  target: Reference[];
  recorded: string;
  agent: ProvenanceAgent[];
  activity?: CodeableConcept;
  reason?: CodeableConcept[];
}
