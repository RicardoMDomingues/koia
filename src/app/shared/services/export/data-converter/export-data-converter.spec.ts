import { Column, DataType } from 'app/shared/model';
import { ExportDataConverter } from './export-data-converter';

describe('ExportDataConverter', () => {

    const converter = new ExportDataConverter();

    it('#restoreJSONObjects should restore stringified JSON objects', () => {

        // given
        const object = { x: 'test', y: 100, z: [1, 2, 3, 4] };
        const objectAsString = JSON.stringify(object);
        const array = [{ n: 1 }, { n: 2 }, { n: 3 }];
        const arrayAsString = JSON.stringify(array);
        const data = [
            { a: 'x', b: 1, c: objectAsString, d: arrayAsString },
            { a: 'y', b: 2, c: objectAsString },
            { a: 'z', b: 3, d: arrayAsString }
        ];
        const columns: Column[] = [
            { name: 'a', dataType: DataType.TEXT, width: 100 },
            { name: 'b', dataType: DataType.NUMBER, width: 60 },
            { name: 'c', dataType: DataType.OBJECT, width: 200 },
            { name: 'd', dataType: DataType.OBJECT, width: 200 }
        ];

        // when
        converter.restoreJSONObjects(data, columns);

        // then
        const expected = [
            { a: 'x', b: 1, c: object, d: array },
            { a: 'y', b: 2, c: object },
            { a: 'z', b: 3, d: array }
        ];
        expect(data as any).toEqual(expected);
    });

    it('#timeToFormattedString', () => {
        // given        
        const data: Object[] = [
            { Position: 1, Name: 'A', Amount: 100.5, Time: 1547809200000 },
            { Position: 2, Name: 'B', Amount: 15, Time: 1547812800000 },
            { Position: 3, Name: 'C', Amount: 78.6, Time: 1547816400000 },
            { Position: 4, Name: 'D', Amount: 45.2, Time: 1547820000000 }
        ];
        const columns: Column[] = [
            { name: 'Position', dataType: DataType.NUMBER, width: 10 },
            { name: 'Name', dataType: DataType.NUMBER, width: 40 },
            { name: 'Amount', dataType: DataType.NUMBER, width: 8 },
            { name: 'Time', dataType: DataType.TIME, width: 16, format: 'd MMM yyyy HH:mm:ss' },
        ];

        // when
        converter.timeToFormattedString(data, columns);

        // then
        const expected = [
            { Position: 1, Name: 'A', Amount: 100.5, Time: '18 Jan 2019 12:00:00' },
            { Position: 2, Name: 'B', Amount: 15, Time: '18 Jan 2019 13:00:00' },
            { Position: 3, Name: 'C', Amount: 78.6, Time: '18 Jan 2019 14:00:00' },
            { Position: 4, Name: 'D', Amount: 45.2, Time: '18 Jan 2019 15:00:00' }
        ];
        expect(data as any).toEqual(expected);
    });
});