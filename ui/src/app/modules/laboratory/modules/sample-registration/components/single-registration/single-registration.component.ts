import { Component, Input, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatRadioChange } from "@angular/material/radio";
import * as moment from "moment";
import { Observable, zip } from "rxjs";
import { map } from "rxjs/operators";
import { NON_CLINICAL_PERSON_DATA } from "src/app/core/constants/non-clinical-person.constant";
import {
  determineIfAtLeastOneTestHasNoDepartment,
  formulateSamplesByDepartments,
} from "src/app/core/helpers/create-samples-as-per-departments.helper";
import { Location } from "src/app/core/models";
import { SystemSettingsWithKeyDetails } from "src/app/core/models/system-settings.model";
import { LocationService } from "src/app/core/services";
import { IdentifiersService } from "src/app/core/services/identifiers.service";
import { LabSampleModel } from "src/app/modules/laboratory/resources/models";
import { LabOrdersService } from "src/app/modules/laboratory/resources/services/lab-orders.service";
import { LabTestsService } from "src/app/modules/laboratory/resources/services/lab-tests.service";
import { RegistrationService } from "src/app/modules/registration/services/registration.services";
import { formatDateToYYMMDD } from "src/app/shared/helpers/format-date.helper";
import { DateField } from "src/app/shared/modules/form/models/date-field.model";
import { Dropdown } from "src/app/shared/modules/form/models/dropdown.model";
import { FormValue } from "src/app/shared/modules/form/models/form-value.model";
import { Textbox } from "src/app/shared/modules/form/models/text-box.model";
import { ICARE_CONFIG } from "src/app/shared/resources/config";
import { DiagnosisService } from "src/app/shared/resources/diagnosis/services";
import { ConceptGetFull } from "src/app/shared/resources/openmrs";
import { VisitsService } from "src/app/shared/resources/visits/services";
import { SamplesService } from "src/app/shared/services/samples.service";
import { BarCodeModalComponent } from "../../../sample-acceptance-and-results/components/bar-code-modal/bar-code-modal.component";

import { uniqBy } from "lodash";

@Component({
  selector: "app-single-registration",
  templateUrl: "./single-registration.component.html",
  styleUrls: ["./single-registration.component.scss"],
})
export class SingleRegistrationComponent implements OnInit {
  labSampleLabel$: Observable<string>;
  @Input() mrnGeneratorSourceUuid: string;
  @Input() preferredPersonIdentifier: string;
  @Input() provider: any;
  @Input() agencyConceptConfigs: any;
  @Input() referFromFacilityVisitAttribute: string;
  @Input() referringDoctorAttributes: SystemSettingsWithKeyDetails[];
  @Input() labSections: ConceptGetFull[];

  departmentField: any = {};
  specimenDetailsFields: any;
  testsFormField: any = {};
  agencyFormField: any = {};
  labFormField: any = {};
  formData: any = {};
  testsUnderSpecimen$: Observable<any[]>;
  selectedSpecimenUuid: string;

  currentLocation: Location;
  patientPayload: any;
  personDetailsData: any;
  savingData: boolean = false;
  savingDataResponse: any = null;
  currentSampleLabel: string;
  selectedLab: any;

  referringDoctorFields: any[];

  patientFieldSetClosed: boolean = false;

  registrationCategory: string = "Clinical";

  receivedOnField: any;
  receivedByField: any;

  testOrders: any[] = [];
  groupedTestOrdersByDepartments: any[] = [];
  errorMessage: string = "";

  sampleLabelsUsedDetails: any[] = [];

  isRegistrationReady: boolean = true;

  constructor(
    private samplesService: SamplesService,
    private labTestsService: LabTestsService,
    private locationService: LocationService,
    private registrationService: RegistrationService,
    private identifierService: IdentifiersService,
    private visitsService: VisitsService,
    private labOrdersService: LabOrdersService,
    private diagnosisService: DiagnosisService,
    private dialog: MatDialog
  ) {
    this.currentLocation = JSON.parse(localStorage.getItem("currentLocation"));
  }

  ngOnInit(): void {
    this.labSampleLabel$ = this.samplesService.getSampleLabel();
    this.referringDoctorFields = this.referringDoctorAttributes.map(
      (attribute) => {
        return new Textbox({
          id: "attribute-" + attribute?.value,
          key: "attribute-" + attribute?.value,
          label: attribute?.name,
          type: "text",
        });
      }
    );

    this.specimenDetailsFields = [
      new Dropdown({
        id: "specimen",
        key: "specimen",
        label: "Specimen",
        searchTerm: "SPECIMEN_SOURCE",
        options: [],
        conceptClass: "Specimen",
        searchControlType: "concept",
        shouldHaveLiveSearchForDropDownFields: true,
      }),
      new Dropdown({
        id: "condition",
        key: "condition",
        label: "Condition",
        options: [],
        conceptClass: "condition",
        searchControlType: "concept",
        searchTerm: "SAMPLE_CONDITIONS",
        shouldHaveLiveSearchForDropDownFields: true,
      }),
      new Dropdown({
        id: "agency",
        key: "agency",
        label: "Agency/Priority",
        options: [],
        conceptClass: "priority",
        searchControlType: "concept",
        searchTerm: "SAMPLE_PRIORITIES",
        shouldHaveLiveSearchForDropDownFields: true,
      }),
      // new Dropdown({
      //   id: "receivinglab",
      //   key: "receivinglab",
      //   label: "Receiving Lab",
      //   options: [],
      //   searchControlType: "concept",
      //   conceptClass: "Lab Department",
      //   shouldHaveLiveSearchForDropDownFields: true,
      // }),
      // new DateField({
      //   id: "receivedOn",
      //   key: "receivedOn",
      //   label: "Received On",
      // }),
      // new Dropdown({
      //   id: "department",
      //   key: "department",
      //   label: "Department",
      //   options: [],
      //   searchControlType: "concept",
      //   conceptClass: "Lab Department",
      //   shouldHaveLiveSearchForDropDownFields: true,
      // }),
    ];

    this.receivedOnField = new DateField({
      id: "receivedOn",
      key: "receivedOn",
      label: "Received On",
    });

    this.receivedByField = new Dropdown({
      id: "receivedBy",
      key: "receivedBy",
      label: "Received By",
      options: [],
      shouldHaveLiveSearchForDropDownFields: true,
      searchControlType: "user",
    });

    this.agencyFormField = new Dropdown({
      id: "agency",
      key: "agency",
      label: "Agency/Priority",
      options: this.agencyConceptConfigs?.setMembers.map((member) => {
        return {
          key: member?.uuid,
          value: member?.display,
          label: member?.display,
          name: member?.display,
        };
      }),
      shouldHaveLiveSearchForDropDownFields: false,
    });

    const currentLocation = JSON.parse(localStorage.getItem("currentLocation"));
    const labsAvailable =
      currentLocation && currentLocation?.childLocations
        ? currentLocation?.childLocations
        : [];

    // this.labFormField = new Dropdown({
    //   id: "lab",
    //   key: "lab",
    //   label: "Receiving Lab",
    //   options: labsAvailable.map((location) => {
    //     return {
    //       key: location?.uuid,
    //       value: location?.uuid,
    //       label: location?.display,
    //       name: location?.display,
    //     };
    //   }),
    //   shouldHaveLiveSearchForDropDownFields: false,
    // });
  }

  togglePatientDetailsFieldSet(event: Event): void {
    event.stopPropagation();
    this.patientFieldSetClosed = !this.patientFieldSetClosed;
  }

  getSelection(event: MatRadioChange): void {
    this.registrationCategory = event?.value;
  }

  getSelectedReceivedOnTime(event: Event): void {
    this.formData = {
      ...this.formData,
      receivedAt: {
        value: (event.target as any)?.value,
        id: "receivedAt",
        key: "receivedAt",
      },
    };
  }

  onFormUpdate(formValues: FormValue, itemKey?: string): void {
    this.formData = { ...this.formData, ...formValues.getValues() };
    if (
      itemKey &&
      itemKey === "specimenDetails" &&
      this.selectedSpecimenUuid !== this.formData["specimen"]?.value
    ) {
      this.selectedSpecimenUuid = this.formData["specimen"]?.value;
      this.testsUnderSpecimen$ =
        this.labTestsService.getSetMembersByConceptUuid(
          this.selectedSpecimenUuid
        );
    }
  }

  onFormUpdateForTest(testValues: any): void {
    this.formData = { ...this.formData, ...testValues };
    Object.keys(this.formData).forEach((key) => {
      if (key.indexOf("test") === 0) {
        this.testOrders = uniqBy(
          [
            ...this.testOrders,
            {
              ...this.formData[key],
            },
          ],
          "id"
        );
      }
    });
    this.groupedTestOrdersByDepartments = formulateSamplesByDepartments(
      this.labSections,
      this.testOrders
    );

    if (this.testOrders?.length === 0) {
      this.errorMessage = "No test has been selected";
    } else {
      this.errorMessage = "";
    }

    if (this.groupedTestOrdersByDepartments?.length === 0) {
      this.errorMessage = "Test missing lab section";
    } else {
      this.errorMessage = "";
    }
  }

  onFormUpdateForAgency(formValues: FormValue): void {
    this.formData = { ...this.formData, ...formValues.getValues() };
  }

  onFormUpdateForLab(formValues: FormValue): void {
    this.formData = { ...this.formData, ...formValues.getValues() };
  }

  onGetSampleLabel(sampleLabel: string): void {
    this.currentSampleLabel = sampleLabel;
  }

  onGetSelectedOptionDetails(details): void {
    this.formData = { ...this.formData, ...details };
  }

  onGetPersonDetails(personDetails: any): void {
    this.personDetailsData =
      this.registrationCategory === "Clinical"
        ? personDetails
        : NON_CLINICAL_PERSON_DATA;
  }

  onGetClinicalDataValues(clinicalData): void {
    this.formData = { ...this.formData, ...clinicalData };
  }

  onSave(event: Event): void {
    event.stopPropagation();
    // Identify if tests ordered are well configured
    const allTestHaveDepartment = determineIfAtLeastOneTestHasNoDepartment(
      this.labSections,
      this.testOrders
    );
    this.personDetailsData =
      this.registrationCategory === "Clinical"
        ? this.personDetailsData
        : NON_CLINICAL_PERSON_DATA;
    if (this.testOrders?.length === 0) {
      this.errorMessage = "No test has been selected";
    } else if (!allTestHaveDepartment) {
      this.errorMessage = "Test missing lab section";
    } else {
      this.errorMessage = "";
      zip(
        this.registrationService.getPatientIdentifierTypes(),
        this.locationService.getFacilityCode(),
        this.registrationService.getAutoFilledPatientIdentifierType()
      ).subscribe((results) => {
        if (results) {
          const patientIdentifierTypes = results[0];
          this.identifierService
            .generateIds({
              generateIdentifiers: true,
              sourceUuid: this.mrnGeneratorSourceUuid,
              numberToGenerate: 1,
            })
            .subscribe((identifierResponse) => {
              if (identifierResponse) {
                /**
              1. Create user
              2. Create visit (Orders should be added in)
              3. Create sample
              */

                this.patientPayload = {
                  person: {
                    names: [
                      {
                        givenName: this.personDetailsData?.firstName,
                        familyName: this.personDetailsData?.lastName,
                        familyName2: this.personDetailsData?.middleName,
                      },
                    ],
                    gender: this.personDetailsData?.gender,
                    age: this.personDetailsData?.age,
                    birthdate: this.personDetailsData?.dob
                      ? this.personDetailsData?.dob
                      : null,
                    birthdateEstimated: this.personDetailsData?.dob
                      ? false
                      : true,
                    addresses: [
                      {
                        address1: this.personDetailsData?.address,
                        cityVillage: "",
                        country: "",
                        postalCode: "",
                      },
                    ],
                    attributes: [],
                  },
                  identifiers:
                    this.registrationCategory === "Clinical"
                      ? (patientIdentifierTypes || [])
                          .map((personIdentifierType) => {
                            if (
                              personIdentifierType.id ===
                              this.preferredPersonIdentifier
                            ) {
                              return {
                                identifier: this.personDetailsData["mrn"]
                                  ? this.personDetailsData["mrn"]
                                  : this.personDetailsData[
                                      personIdentifierType.id
                                    ],
                                identifierType: personIdentifierType.id,
                                location: this.currentLocation?.uuid,
                                preferred: true,
                              };
                            } else {
                              return {
                                identifier:
                                  this.personDetailsData[
                                    personIdentifierType.id
                                  ],
                                identifierType: personIdentifierType.id,
                                location: this.currentLocation?.uuid,
                                preferred: false,
                              };
                            }
                          })
                          .filter(
                            (patientIdentifier) => patientIdentifier?.identifier
                          )
                      : [
                          {
                            identifier: identifierResponse[0],
                            identifierType: this.preferredPersonIdentifier,
                            location: this.currentLocation?.uuid,
                            preferred: true,
                          },
                        ],
                };
                this.savingData = true;
                this.registrationService
                  .createPatient(
                    this.patientPayload,
                    this.personDetailsData?.patientUuid
                  )
                  .subscribe((patientResponse) => {
                    this.savingDataResponse = patientResponse;
                    if (!patientResponse?.error) {
                      // TODO: SOftcode visit type
                      let visAttributes = [
                        {
                          attributeType: "PSCHEME0IIIIIIIIIIIIIIIIIIIIIIIATYPE",
                          value: "00000102IIIIIIIIIIIIIIIIIIIIIIIIIIII",
                        },
                        {
                          attributeType: "PTYPE000IIIIIIIIIIIIIIIIIIIIIIIATYPE",
                          value: "00000100IIIIIIIIIIIIIIIIIIIIIIIIIIII",
                        },
                        {
                          attributeType: "SERVICE0IIIIIIIIIIIIIIIIIIIIIIIATYPE",
                          value: "30fe16ed-7514-4e93-a021-50024fe82bdd",
                        },
                        {
                          attributeType: "66f3825d-1915-4278-8e5d-b045de8a5db9",
                          value: "d1063120-26f0-4fbb-9e7d-f74c429de306",
                        },
                        {
                          attributeType: "6eb602fc-ae4a-473c-9cfb-f11a60eeb9ac",
                          value: "b72ed04a-2c4b-4835-9cd2-ed0e841f4b58",
                        },
                      ];

                      if (this.registrationCategory === "Clinical") {
                        const personDataAttributeKeys =
                          Object.keys(this.personDetailsData).filter(
                            (key) => key.indexOf("attribute-") === 0
                          ) || [];

                        const formDataAttributeKeys =
                          Object.keys(this.formData).filter(
                            (key) => key.indexOf("attribute-") === 0
                          ) || [];

                        personDataAttributeKeys.forEach((key) => {
                          visAttributes = [
                            ...visAttributes,
                            {
                              attributeType: key.split("attribute-")[1],
                              value: this.personDetailsData[key],
                            },
                          ];
                        });

                        formDataAttributeKeys.forEach((key) => {
                          visAttributes = [
                            ...visAttributes,
                            {
                              attributeType: key.split("attribute-")[1],
                              value: this.formData[key]?.value,
                            },
                          ];
                        });
                      }
                      const visitObject = {
                        patient: this.savingDataResponse?.uuid,
                        visitType: "54e8ffdc-dea0-4ef0-852f-c23e06d16066",
                        location: this.currentLocation?.uuid,
                        indication: "Sample Registration",
                        attributes: visAttributes,
                      };

                      this.visitsService
                        .createVisit(visitObject)
                        .subscribe((visitResponse) => {
                          this.savingDataResponse = visitResponse;
                          if (!visitResponse?.error) {
                            this.savingData = true;

                            // Create encounter with orders
                            zip(
                              ...this.groupedTestOrdersByDepartments.map(
                                (groupedTestOrders) => {
                                  const orders = groupedTestOrders.map(
                                    (testOrder) => {
                                      return {
                                        concept: testOrder?.value,
                                        orderType:
                                          "52a447d3-a64a-11e3-9aeb-50e549534c5e", // TODO: Find a way to soft code this
                                        action: "NEW",
                                        orderer: this.provider?.uuid,
                                        patient: patientResponse?.uuid,
                                        careSetting: "OUTPATIENT",
                                        urgency: "ROUTINE", // TODO: Change to reflect users input
                                        instructions: "",
                                        type: "testorder",
                                      };
                                    }
                                  );
                                  const encounterObject = {
                                    visit: visitResponse?.uuid,
                                    patient: patientResponse?.uuid,
                                    encounterType:
                                      "9b46d3fe-1c3e-4836-a760-f38d286b578b",
                                    location: this.currentLocation?.uuid,
                                    orders,
                                    encounterProviders: [
                                      {
                                        provider: this.provider?.uuid,
                                        encounterRole:
                                          ICARE_CONFIG.encounterRole,
                                      },
                                    ],
                                  };
                                  return this.labOrdersService.createLabOrdersViaEncounter(
                                    encounterObject
                                  );
                                }
                              )
                            ).subscribe((responses: any[]) => {
                              if (responses) {
                                responses.forEach(
                                  (encounterResponse, index) => {
                                    if (!encounterResponse?.error) {
                                      this.savingData = true;
                                      this.samplesService
                                        .getSampleLabel()
                                        .subscribe((sampleLabelResponse) => {
                                          if (sampleLabelResponse) {
                                            // Create sample
                                            const sampleLabel =
                                              "LIS/TZ/" + sampleLabelResponse;
                                            const sample = {
                                              visit: {
                                                uuid: visitResponse?.uuid,
                                              },
                                              label: sampleLabel,
                                              concept: {
                                                uuid: this
                                                  .groupedTestOrdersByDepartments[
                                                  index
                                                ][0]?.departmentUuid,
                                              },
                                              orders:
                                                encounterResponse?.orders.map(
                                                  (order) => {
                                                    return {
                                                      uuid: order?.uuid,
                                                    };
                                                  }
                                                ),
                                            };
                                            // Create sample
                                            this.samplesService
                                              .createLabSample(sample)
                                              .subscribe((sampleResponse) => {
                                                this.sampleLabelsUsedDetails = [
                                                  ...this
                                                    .sampleLabelsUsedDetails,
                                                  {
                                                    ...sample,
                                                  },
                                                ];
                                                this.savingDataResponse =
                                                  sampleResponse;
                                                if (sampleResponse) {
                                                  this.savingData = this
                                                    .formData["agency"]?.value
                                                    ? true
                                                    : false;
                                                  let statuses = [];
                                                  if (
                                                    this.formData["agency"]
                                                      ?.value
                                                  ) {
                                                    const agencyStatus = {
                                                      sample: {
                                                        uuid: sampleResponse?.uuid,
                                                      },
                                                      user: {
                                                        uuid: localStorage.getItem(
                                                          "userUuid"
                                                        ),
                                                      },
                                                      remarks:
                                                        this.formData["agency"]
                                                          ?.value,
                                                      status: "PRIORITY",
                                                    };
                                                    statuses = [
                                                      ...statuses,
                                                      agencyStatus,
                                                    ];
                                                  }

                                                  if (
                                                    this.formData["receivedOn"]
                                                      ?.value
                                                  ) {
                                                    const receivedOnStatus = {
                                                      sample: {
                                                        uuid: sampleResponse?.uuid,
                                                      },
                                                      user: {
                                                        uuid: localStorage.getItem(
                                                          "userUuid"
                                                        ),
                                                      },
                                                      remarks: "RECEIVED_ON",
                                                      status: "RECEIVED_ON",
                                                      timestamp: `${moment(
                                                        this.formData[
                                                          "receivedOn"
                                                        ]?.value
                                                      ).format("YYYY-MM-DD")} ${
                                                        this.formData[
                                                          "receivedAt"
                                                        ]?.value
                                                      }:00.001`,
                                                    };
                                                    statuses = [
                                                      ...statuses,
                                                      receivedOnStatus,
                                                    ];
                                                  }

                                                  if (
                                                    this.formData["condition"]
                                                      ?.value
                                                  ) {
                                                    const receivedOnStatus = {
                                                      sample: {
                                                        uuid: sampleResponse?.uuid,
                                                      },
                                                      user: {
                                                        uuid: localStorage.getItem(
                                                          "userUuid"
                                                        ),
                                                      },
                                                      remarks:
                                                        this.formData[
                                                          "condition"
                                                        ]?.value,
                                                      status: "CONDITION",
                                                    };
                                                    statuses = [
                                                      ...statuses,
                                                      receivedOnStatus,
                                                    ];
                                                  }

                                                  const receivedByStatus = {
                                                    sample: {
                                                      uuid: sampleResponse?.uuid,
                                                    },
                                                    user: {
                                                      uuid: this.formData[
                                                        "receivedBy"
                                                      ]?.value
                                                        ? this.formData[
                                                            "receivedBy"
                                                          ]?.value
                                                        : localStorage.getItem(
                                                            "userUuid"
                                                          ),
                                                    },
                                                    remarks: "RECEIVED_BY",
                                                    status: "RECEIVED_BY",
                                                    timestamp: `${moment(
                                                      this.formData[
                                                        "receivedOn"
                                                      ]?.value
                                                    ).format("YYYY-MM-DD")} ${
                                                      this.formData[
                                                        "receivedAt"
                                                      ]?.value
                                                    }:00.001`,
                                                  };
                                                  statuses = [
                                                    ...statuses,
                                                    receivedByStatus,
                                                  ];

                                                  if (statuses?.length > 0) {
                                                    this.samplesService
                                                      .setMultipleSampleStatuses(
                                                        statuses
                                                      )
                                                      .subscribe(
                                                        (
                                                          sampleStatusResponse
                                                        ) => {
                                                          this.savingDataResponse =
                                                            sampleStatusResponse;
                                                          if (
                                                            sampleStatusResponse
                                                          ) {
                                                            this.dialog
                                                              .open(
                                                                BarCodeModalComponent,
                                                                {
                                                                  height:
                                                                    "200px",
                                                                  width: "15%",
                                                                  data: {
                                                                    identifier:
                                                                      this
                                                                        .currentSampleLabel,
                                                                    sample:
                                                                      sample,
                                                                    sampleLabelsUsedDetails:
                                                                      this
                                                                        .sampleLabelsUsedDetails,
                                                                  },
                                                                  disableClose:
                                                                    false,
                                                                  panelClass:
                                                                    "custom-dialog-container",
                                                                }
                                                              )
                                                              .afterClosed()
                                                              .subscribe(() => {
                                                                this.isRegistrationReady =
                                                                  false;
                                                                setTimeout(
                                                                  () => {
                                                                    this.isRegistrationReady =
                                                                      true;
                                                                  },
                                                                  200
                                                                );
                                                              });
                                                            this.savingData =
                                                              false;
                                                          }
                                                        }
                                                      );
                                                  }
                                                }
                                              });
                                          }
                                        });

                                      // Set diagnosis if any

                                      if (
                                        encounterResponse?.uuid &&
                                        this.formData["icd10"]
                                      ) {
                                        const diagnosisData = {
                                          diagnosis: {
                                            coded:
                                              this.formData["icd10"]?.value,
                                            nonCoded:
                                              this.formData["diagnosis"]?.value,
                                            specificName: null,
                                          },
                                          rank: 0,
                                          condition: null,
                                          certainty: "PROVISIONAL",
                                          patient: patientResponse?.uuid,
                                          encounter: encounterResponse?.uuid,
                                        };

                                        this.diagnosisService
                                          .addDiagnosis(diagnosisData)
                                          .subscribe((diagnosisResponse) => {
                                            if (diagnosisResponse) {
                                              this.savingData = false;
                                            }
                                          });
                                      }
                                    } else {
                                      this.savingData = false;
                                    }
                                  }
                                );
                              }
                            });
                            // this.labOrdersService
                            //   .createLabOrdersViaEncounter(encounterObject)
                            //   .subscribe((encounterResponse) => {
                            //     this.savingDataResponse = encounterResponse;

                            //   });
                          } else {
                            this.savingData = false;
                          }
                        });
                    } else {
                      this.savingData = false;
                    }
                  });
              }
            });
        }
      });
    }
  }
}
