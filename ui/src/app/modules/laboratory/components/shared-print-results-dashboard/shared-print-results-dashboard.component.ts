import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";

import jsPDF from "jspdf";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;
import htmlToPdfmake from "html-to-pdfmake";
import { formatDateToYYMMDD } from "src/app/shared/helpers/format-date.helper";
import { SystemSettingsService } from "src/app/core/services/system-settings.service";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Component({
  selector: "app-shared-print-results-dashboard",
  templateUrl: "./shared-print-results-dashboard.component.html",
  styleUrls: ["./shared-print-results-dashboard.component.scss"],
})
export class SharedPrintResultsDashboardComponent implements OnInit {
  @Input() testRelationshipConceptSourceUuid: string;
  @Input() data: any;
  @Input() currentUser: any;

  @ViewChild("report") pdfTable: ElementRef;
  collectionDateAndTimeUuids$: Observable<any>;
  receptionDateAndTimeUuids$: Observable<any>;
  requestedByUuids$: Observable<any>;
  clinicalDataUuids$: Observable<any>;
  errors: any[] = [];
  constructor(private systemSettingsService: SystemSettingsService) {}

  ngOnInit(): void {
    this.collectionDateAndTimeUuids$ = this.systemSettingsService
      .getSystemSettingsByKey(
        `lis.labreport.sampleInformation.collectionDateAndTime.concepts.uuids`
      )
      .pipe(
        map((response) => {
          if (response && !response?.error && response != "none") {
            return response;
          } else {
            this.errors = [
              ...this.errors,
              {
                error: {
                  error:
                    "Configuration lis.labreport.sampleInformation.collectionDateAndTime.concepts.uuids is missing, contact IT",
                  message:
                    "Configuration lis.labreport.sampleInformation.collectionDateAndTime.concepts.uuids is missing, contact IT",
                },
              },
            ];
            return response;
          }
        })
      );
    this.receptionDateAndTimeUuids$ = this.systemSettingsService
      .getSystemSettingsByKey(
        `lis.labreport.sampleInformation.receptionDateAndTime.concepts.uuids`
      )
      .pipe(
        map((response) => {
          if (response && !response?.error && response != "none") {
            return response;
          } else {
            this.errors = [
              ...this.errors,
              {
                error: {
                  error:
                    "Configuration lis.labreport.sampleInformation.receptionDateAndTime.concepts.uuids is missing, contact IT",
                  message:
                    "Configuration lis.labreport.sampleInformation.receptionDateAndTime.concepts.uuids is missing, contact IT",
                },
              },
            ];
            return response;
          }
        })
      );
    this.requestedByUuids$ = this.systemSettingsService
      .getSystemSettingsByKey(
        `lis.labreport.sampleInformation.requestedBy.concepts.uuids`
      )
      .pipe(
        map((response) => {
          if (response && !response?.error && response != "none") {
            return response;
          } else {
            this.errors = [
              ...this.errors,
              {
                error: {
                  error:
                    "Configuration lis.labreport.sampleInformation.requestedBy.concepts.uuids is missing, contact IT",
                  message:
                    "Configuration lis.labreport.sampleInformation.requestedBy.concepts.uuids is missing, contact IT",
                },
              },
            ];
            return response;
          }
        })
      );
    this.clinicalDataUuids$ = this.systemSettingsService
      .getSystemSettingsByKey(
        `lis.labreport.sampleInformation.clinicalData.concepts.uuids`
      )
      .pipe(
        map((response) => {
          if (response && !response?.error && response != "none") {
            return response;
          } else {
            this.errors = [
              ...this.errors,
              {
                error: {
                  error:
                    "Configuration lis.labreport.sampleInformation.clinicalData.concepts.uuids is missing, contact IT",
                  message:
                    "Configuration lis.labreport.sampleInformation.clinicalData.concepts.uuids is missing, contact IT",
                },
              },
            ];
            return response;
          }
        })
      );
  }

  printPDF(event: Event) {
    event.stopPropagation();

    // const doc = new jsPDF();

    const pdfTable = this.pdfTable.nativeElement;

    var html = htmlToPdfmake(pdfTable.innerHTML);

    const documentDefinition = {
      content: html,
      footer: (page, pages) => {
        return {
          columns: [
            {
              alignment: "left",
              fontSize: 10,
              text: `Printed on ${formatDateToYYMMDD(new Date())} ${
                this.formatDimeChars(new Date().getHours().toString()) +
                ":" +
                this.formatDimeChars(new Date().getMinutes().toString())
              } `,
            },
            {
              alignment: "center",
              fontSize: 12,
              marginTop: -24,
              text: page === pages ? "....End of laboratory report...." : "",
            },
            {
              alignment: "right",
              fontSize: 10,
              text: `Page ${page.toString()} of ${pages.toString()}`,
            },
          ],
          margin: [10, 10, 10, 10],
        };
      },
    };
    pdfMake.createPdf(documentDefinition).open();
  }

  formatDimeChars(char: string): string {
    return char.length == 1 ? "0" + char : char;
  }
}
