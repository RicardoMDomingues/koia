import { AfterViewInit, Directive, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { ChartComponent } from 'app/chart/chart.component';
import { SummaryTableComponent } from 'app/summary-table/summary-table.component';
import { Subscription, lastValueFrom } from 'rxjs';
import { AbstractComponent } from '../component/abstract.component';
import { InputDialogData } from '../component/input-dialog/input-dialog.component';
import { ViewLauncherContext } from '../component/view-launcher-dialog';
import { Column, DataType, ElementContext, ExportFormat, Query, Route, Scene, SummaryContext } from '../model';
import { ChartContext, ChartType } from '../model/chart';
import { GraphContext } from '../model/graph';
import { View } from '../model/view-config';
import { DialogService, ExportService, NotificationService, ViewPersistenceService } from '../services';
import { DBService } from '../services/backend';
import { CouchDBConstants } from '../services/backend/couchdb/couchdb-constants';
import { ChartMarginService } from '../services/chart';
import { ConfigToModelConverter, ModelToConfigConverter } from '../services/view-persistence';
import { ArrayUtils, ChartUtils, CommonUtils, DateTimeUtils } from '../utils';

@Directive()
export abstract class ViewController extends AbstractComponent implements OnInit, AfterViewInit, ViewLauncherContext {

   static readonly MARGIN_TOP = 10;
   static readonly SIDENAV_WIDTH = 340; // keep in sync with .sidenav in styles.css
   static readonly ALL_EXPORT_FORMATS = Object.keys(ExportFormat).map(key => ExportFormat[key]);

   @ViewChild(MatSidenav) sidenav: MatSidenav;
   @ViewChild('content') divContentRef: ElementRef<HTMLDivElement>;
   @ViewChildren('elementContainer') elementContainerDivRefs: QueryList<ElementRef<HTMLDivElement>>;
   @ViewChildren(ChartComponent) chartComponents: QueryList<ChartComponent>;
   @ViewChildren(SummaryTableComponent) sumTableComponents: QueryList<SummaryTableComponent>;
   @ViewChildren('but_configure') configButtonsRefs: QueryList<ElementRef<HTMLButtonElement>>;

   elementContexts: ElementContext[];
   selectedContext: ElementContext;
   selectedContextPosition: number;
   entries: object[];
   loading: boolean;

   private timeColumns: Column[];
   private configToModelConverter: ConfigToModelConverter;
   private modelToConfigConverter = new ModelToConfigConverter();
   private query: Query;
   private scene: Scene;
   private columns: Column[];
   private entriesSubscription: Subscription;

   constructor(public route: Route, private router: Router, bottomSheet: MatBottomSheet, private dbService: DBService,
      private dialogService: DialogService, private viewPersistenceService: ViewPersistenceService,
      private chartMarginService: ChartMarginService, notificationService: NotificationService, private exportService: ExportService) {
      super(bottomSheet, notificationService);
   }

   ngOnInit(): void {
      this.scene = this.dbService.getActiveScene();
      if (!this.scene) {
         this.router.navigateByUrl(Route.SCENES);
      } else {
         this.elementContexts = [];
         this.query = new Query();
         this.queryData(this.query);
         this.identifyColumns();
      }
   }

   ngAfterViewInit(): void {
      if (this.scene) {
         if (this.elementContainerDivRefs.length === 0) {
            this.dialogService.showViewLauncherDialog(this);
         } else {
            this.elementContainerDivRefs.changes.subscribe(c => {
               if (this.elementContainerDivRefs.last) {
                  const htmlDiv = this.elementContainerDivRefs.last.nativeElement;
                  htmlDiv.scrollIntoView();
               }
            });
         }
      }
   }

   private identifyColumns(): void {
      this.columns = this.scene.columns
         .filter(c => c.indexed)
         .filter(c => c.name !== CouchDBConstants._ID);
      this.configToModelConverter = new ConfigToModelConverter(this.columns);
      this.timeColumns = this.columns
         .filter(c => c.dataType === DataType.TIME);
      DateTimeUtils.defineTimeUnits(this.timeColumns, this.entries);
   }

   addSummaryTable(): SummaryContext {
      const context = new SummaryContext(this.clonedColumns());
      context.query = this.query;
      context.entries = this.entries;
      this.elementContexts = this.elementContexts.concat([context]);
      this.configure(null, context);
      return context;
   }

   addChart(): ChartContext {
      const chartType = ChartType.BAR;
      const chartMargin = this.chartMarginService.marginOf(chartType);
      const context = new ChartContext(this.clonedColumns(), chartType.type, chartMargin);
      context.groupByColumns = ChartUtils.identifyGroupByColumns(context);
      context.query = this.query;
      context.entries = this.entries;
      this.elementContexts = this.elementContexts.concat([context]);
      this.configure(null, context);
      return context;
   }

   addGraph(): GraphContext {
      const context = new GraphContext(this.clonedColumns());
      context.query = this.query;
      context.entries = this.entries;
      this.elementContexts = this.elementContexts.concat([context]);
      this.configure(null, context);
      return context;
   }

   private clonedColumns(): Column[] {
      return this.columns.map(c => <Column>CommonUtils.clone(c));
   }

   onFilterChanged(query: Query): void {
      this.query = query;
      this.elementContexts.forEach(c => c.query = query)
      this.queryData(query);
   }

   private queryData(query: Query): void {
      this.loading = true;
      if (this.entriesSubscription) {
         this.entriesSubscription.unsubscribe();
      }
      this.entriesSubscription = this.dbService.findEntries(query, true).subscribe({
         next: (data) => {
            this.entries = data;
            this.elementContexts.forEach(c => c.entries = data);
         },
         error: (err) => this.notifyError(err),
         complete: () => this.loading = false
      });
   }

   isSummaryContext(context: ElementContext): boolean {
      return context instanceof SummaryContext;
   }

   isShowResizableMargin(context: ElementContext): boolean {
      return this.isChartContext(context) && this.asChartContext(context).isShowResizableMargin();
   }

   isChartContext(context: ElementContext): boolean {
      return context instanceof ChartContext;
   }

   asChartContext(context: ElementContext): ChartContext {
      return <ChartContext>context;
   }

   isGraphContext(context: ElementContext): boolean {
      return context instanceof GraphContext;
   }

   configure(event: MouseEvent, context: ElementContext): void {
      this.selectedContext = context;
      this.selectedContextPosition = this.elementContexts.indexOf(context) + 1;
      this.sidenav.mode = !event || event.clientX < ViewController.SIDENAV_WIDTH ? 'push' : 'over';
      this.sidenav.open();
   }

   /**
   * @param position starts at 1
   */
   changeElementPosition(position: number): void {
      ArrayUtils.move(this.elementContexts, this.selectedContextPosition - 1, position - 1);
      this.selectedContextPosition = position;
      this.elementContexts = this.elementContexts.slice(0);
   }

   removeElement(context: ElementContext): void {
      this.elementContexts = this.elementContexts.filter(c => c !== context);
   }

   findViews(): View[] {
      return this.scene ? this.viewPersistenceService.findViews(this.scene, this.route) : [];
   }

   loadView(view: View): void {
      this.onPreRestoreView(view);
      const elementContexts = this.configToModelConverter.convert(view.elements);
      elementContexts.forEach(c => {
         c.query = this.query;
         c.entries = this.entries;
      });
      this.elementContexts = elementContexts;
   }

   protected abstract onPreRestoreView(view: View): void;

   saveView(): void {
      if (this.elementContexts.length === 0) {
         this.notifyWarning('View contains no elements');
         return;
      }
      const data = new InputDialogData('Save View', 'View Name', '', 20);
      const dialogRef = this.dialogService.showInputDialog(data);
      lastValueFrom(dialogRef.afterClosed())
         .then(r => {
            if (data.closedWithOK) {
               const view = this.modelToConfigConverter.convert(this.route, data.input, this.elementContexts);
               this.onPreSaveView(view);
               this.viewPersistenceService.saveView(this.scene, view)
                  .then(s => this.showStatus(s));
            }
         });
   }

   protected abstract onPreSaveView(view: View): void;

   printView(): void {
      window.print();
   }

   saveAs(context: ElementContext, exportFormat: ExportFormat): void {
      if (this.isChartContext(context)) {
         const base64Image = this.asChartContext(context).chart.toBase64Image();
         this.exportService.exportImage(base64Image, exportFormat, context.getTitle());
      } else if (this.isSummaryContext(context)) {
         const sumTableComponent = this.sumTableComponents.find(cmp => cmp.context === context);
         this.exportService.exportData(sumTableComponent.createExportData(), this.columns, exportFormat, context.getTitle());
      }
   }
}
