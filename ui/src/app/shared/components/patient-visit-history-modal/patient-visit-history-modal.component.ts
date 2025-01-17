import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Store } from "@ngrx/store";
import { Observable, of } from "rxjs";
import { AppState } from "src/app/store/reducers";
import {
  getAllForms,
  getOpenMRSForms,
} from "src/app/store/selectors/form.selectors";
import { VisitsService } from "../../resources/visits/services";
import { catchError } from "rxjs/operators";

//..........Type Safety for data...........
interface PatientVisitHistoryData {
  patientUuid?: string;
  shouldShowVitalsOnly?: boolean;
  location?: {
    tags?: { name: string }[];
  };
}


@Component({
  selector: "app-patient-visit-history-modal",
  templateUrl: "./patient-visit-history-modal.component.html",
  styleUrls: ["./patient-visit-history-modal.component.scss"],
})
export class PatientVisitHistoryModalComponent implements OnInit {
  visits: any[];
  patientVisits$: Observable<any>;
  patientUuid: string;
  shouldShowVitalsOnly: Boolean;
  omitCurrent: boolean = true;
  forms$: Observable<any[]>;

  //.........Initialization of data in Constructor..............
  constructor(
    private visitService: VisitsService,
    private dialogRef: MatDialogRef<PatientVisitHistoryModalComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any,
    private store: Store<AppState>
  ) {
    this.patientUuid = data?.patientUuid || '';
    this.shouldShowVitalsOnly = !!(
      data?.shouldShowVitalsOnly ||
      (data?.location?.tags?.find(({ name }) => name === 'Triage Location'))
    );
  }
  
//.............Handle Null or Undefined patientUuid.............
ngOnInit(): void {
  console.log("Injected Data:", this.data);

  this.forms$ = this.store.select(getOpenMRSForms).pipe(
    catchError((error) => {
      console.error("Error fetching forms:", error);
      return of([]);
    })
  );
    if (this.patientUuid) {
      this.patientVisits$ = this.visitService.getAllPatientVisits(
        this.patientUuid,
        true,
        this.omitCurrent
      );
    } else {
      console.warn('No patient UUID provided.');
      this.patientVisits$ = new Observable((subscriber) => {
        subscriber.next([]);
        subscriber.complete();
      });
    }
  }
}  

