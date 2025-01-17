import { Component, Inject, OnInit, OnDestroy } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Store } from "@ngrx/store";
import { Observable, of, Subscription } from "rxjs";
import { catchError } from "rxjs/operators";
import { AppState } from "src/app/store/reducers";
import { getOpenMRSForms } from "src/app/store/selectors/form.selectors";
import { VisitsService } from "../../resources/visits/services";

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
export class PatientVisitHistoryModalComponent implements OnInit, OnDestroy {
  visits: any[] = [];
  patientVisits$: Observable<any>;
  patientUuid: string = "";
  shouldShowVitalsOnly: Boolean = false;
  omitCurrent: boolean = true;
  forms$: Observable<any[]>;
  private formsSubscription: Subscription;
  private visitsSubscription: Subscription;

  constructor(
    private visitService: VisitsService,
    private dialogRef: MatDialogRef<PatientVisitHistoryModalComponent>,
    @Inject(MAT_DIALOG_DATA) private data: PatientVisitHistoryData,
    private store: Store<AppState>
  ) {
    this.patientUuid = data?.patientUuid || "";
    this.shouldShowVitalsOnly = !!(
      data?.shouldShowVitalsOnly ||
      data?.location?.tags?.some(({ name }) => name === "Triage Location")
    );
  }

  ngOnInit(): void {
    console.log("Injected Data:", this.data);

    this.forms$ = this.store.select(getOpenMRSForms).pipe(
      catchError((error) => {
        console.error("Error fetching forms:", error);
        return of([]);
      })
    );

    if (this.patientUuid) {
      this.patientVisits$ = this.visitService
        .getAllPatientVisits(this.patientUuid, true, this.omitCurrent)
        .pipe(
          catchError((error) => {
            console.error("Error fetching patient visits:", error);
            return of([]);
          })
        );
    } else {
      console.warn("No patient UUID provided.");
      this.patientVisits$ = of([]);
    }
  }

  ngOnDestroy(): void {
    this.formsSubscription?.unsubscribe();
    this.visitsSubscription?.unsubscribe();
  }
}
