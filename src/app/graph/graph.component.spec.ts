import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { of, Observable } from 'rxjs';
import { GraphComponent } from './graph.component';
import { GraphContext, Column, GraphNode, DataType, Scene } from 'app/shared/model';
import { SimpleChange } from '@angular/core';
import { GraphData, GraphDataService, RawDataRevealService } from 'app/shared/services';
import { RouterTestingModule } from '@angular/router/testing';
import { SceneFactory } from 'app/shared/test';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';

fdescribe('GraphComponent', () => {

  let columns: Column[];
  let scene: Scene;
  let context: GraphContext;
  let entries$: Observable<Object[]>;
  let component: GraphComponent;
  let fixture: ComponentFixture<GraphComponent>;
  const graphDataService = new GraphDataService();

  beforeAll(() => {
    columns = [
      { name: 't1', dataType: DataType.TEXT, width: 200 },
      { name: 'n1', dataType: DataType.NUMBER, width: 50 },
      { name: 't2', dataType: DataType.TEXT, width: 300 }
    ]
    scene = SceneFactory.createScene('1', []);
    entries$ = of([
      { t1: 'a', n1: 1, t2: null },
      { t1: 'b', n1: 2, t2: 'x' },
      { t1: 'b', n1: 3, t2: 'y' },
      { t1: 'b', n1: 2, t2: 'x' }
    ]);
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatProgressBarModule, RouterTestingModule, MatDialogModule],
      declarations: [GraphComponent],
      providers: [
        { provide: GraphDataService, useValue: graphDataService },
        { provide: RawDataRevealService, useClass: RawDataRevealService }
      ]
    })
    fixture = TestBed.createComponent(GraphComponent);
    component = fixture.componentInstance;
    context = new GraphContext(columns);
    component.context = context;
    component.entries$ = entries$;
    spyOn(component.onWarning, 'emit');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnChanges should fetch entries when entries$ change', () => {

    // given
    spyOn(component.entries$, 'toPromise').and.returnValue(Promise.resolve(null));

    // when
    component.ngOnChanges({ entries$: new SimpleChange(undefined, entries$, true) });

    // then
    expect(component.entries$.toPromise).toHaveBeenCalled();
  });

  it('ngOnChanges should not fetch entries when entries$ does not change', () => {

    // given
    spyOn(component.entries$, 'toPromise').and.returnValue(Promise.resolve(null));

    // when
    component.ngOnChanges({ context: new SimpleChange(undefined, context, true) });

    // then
    expect(component.entries$.toPromise).not.toHaveBeenCalled();
  });

  fit('should compute graph data when structure changes', fakeAsync(() => {

    // given
    context.dataColumns = [findColumn('n1')];
    fixture.detectChanges();
    component.ngOnInit();
    component.ngOnChanges({ 'entries$': new SimpleChange(null, null, true) });
    flush();

    // when
    context.groupByColumns = [findColumn('t1')];
    fixture.detectChanges();
    flush();

    // then
    const joc = jasmine.objectContaining;
    const root: GraphNode = { index: 0, parent: null, group: 0, name: '', value: '', info: null };
    const child1: GraphNode = { index: 1, parent: root, group: 1, name: 't1', value: 'a', info: '1' };
    const child2: GraphNode = { index: 2, parent: root, group: 2, name: 't1', value: 'b', info: '3' };
    const expected: GraphData = {
      nodes: [root, child1, child2],
      links: [
        { source: root, target: child1 },
        { source: root, target: child2 }
      ]
    };
    expect(component.graphData).toEqual(joc(expected));
  }));

  it('should create graph options when size changes', fakeAsync(() => {

    // given
    context.dataColumns = [findColumn('n1')];
    fixture.detectChanges();
    component.ngOnInit();
    component.ngOnChanges({ 'entries$': new SimpleChange(null, null, true) });
    flush();

    // when
    context.setSize(120, 500)
    fixture.detectChanges();
    flush();

    // then
    expect(component.graphOptions['chart'].width).toEqual(120);
    expect(component.graphOptions['chart'].height).toEqual(500);
  }));

  it('should warn user when graph contains too many nodes', fakeAsync(() => {

    // given
    context.dataColumns = [findColumn('n1')];
    fixture.detectChanges();
    component.ngOnInit();
    component.ngOnChanges({ 'entries$': new SimpleChange(null, null, true) });
    flush();
    spyOn(graphDataService, 'createData').and.returnValue({ nodes: new Array(GraphComponent.MAX_NODES + 1), links: [] });

    // when
    context.groupByColumns = [findColumn('t1')];
    fixture.detectChanges();
    flush();

    // then
    const msg = 'Graph: Maximum number of ' + GraphComponent.MAX_NODES.toLocaleString() + ' nodes exceeded.' +
      '\n\nPlease choose chart instead or apply/refine data filtering.';
    expect(component.onWarning.emit).toHaveBeenCalledWith(msg);
  }));

  it('#createExportData should throw error', () => {
    expect(() => component.createExportData()).toThrowError('Method not implemented.');
  });

  function findColumn(name: string): Column {
    return columns.find(c => c.name === name);
  }
});
