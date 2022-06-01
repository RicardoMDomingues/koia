import { DataType } from 'app/shared/model';
import { ChartContext, ChartType } from 'app/shared/model/chart';
import { ChartConfiguration } from 'chart.js';

/**
 * In case a bar chart has a single dataset with a limited number of values, this class 
 * transforms the chart configuration in order to show a legend label for each bar
 */
export class BarLegendCustomizer {

    private static MAX_DATA_LENGTH = 20;

    customize(context: ChartContext, config: ChartConfiguration): void {
        const chartType = ChartType.fromType(context.chartType);
        const horizontalBar = chartType === ChartType.HORIZONTAL_BAR;
        if ((chartType === ChartType.BAR || horizontalBar) && context.data.datasets.length === 1
            && context.data.labels.length <= BarLegendCustomizer.MAX_DATA_LENGTH) {

            config.plugins = <any>[{
                beforeLayout: chart => {
                    chart.options.scales[horizontalBar ? 'y1' : 'x1'].labels = chart.data.datasets
                        .filter((ds, i) => !chart.getDatasetMeta(i).hidden)
                        .map(ds => ds.label);
                }
            }];

            config.options.scales[horizontalBar ? 'y' : 'x'].display = false;
            config.options.scales[horizontalBar ? 'y1' : 'x1'] = {
                offset: true
            }

            const dataset = config.data.datasets[0];
            config.data.datasets = <any>config.data.labels.map((l, i) => ({
                label: l,
                data: [{ x: i + 1, y: dataset.data[i] }],
                backgroundColor: dataset.backgroundColor[i],
                borderColor: dataset.borderColor[i],
                categoryPercentage: 1
            }));
            config.data.labels = undefined;
            this.adjustTooltips(config.options.plugins.tooltip, context);
        }
    }

    private adjustTooltips(tooltipOptions: any, context: ChartContext): void {
        if (!tooltipOptions.callbacks) {
            tooltipOptions.callbacks = {};
        }
        const dataColumn = context.dataColumns[0];
        if (context.isAggregationCountSelected() && dataColumn.dataType !== DataType.TEXT) {
            tooltipOptions.callbacks.title = ctx => dataColumn.name + ': ' + ctx[0].dataset.label;
        } else {
            tooltipOptions.callbacks.title = ctx => ctx[0].dataset.label;
        }
        if (context.isAggregationCountSelected()) {
            tooltipOptions.callbacks.label = ctx => 'Count: ' + ctx.formattedValue;
        } else {
            tooltipOptions.callbacks.label = ctx => dataColumn.name + ': ' + ctx.formattedValue;
        }
    }
}