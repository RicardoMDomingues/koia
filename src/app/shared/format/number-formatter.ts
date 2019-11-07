import { NumberUtils } from '../utils/number-utils';

export class NumberFormatter {

   format(num: number): string {
      if (num === null || num === undefined) {
         return '';
      }
      const decimals = NumberUtils.countDecimals(num);
      if (decimals > 3) {
         return num.toLocaleString(undefined, { minimumFractionDigits: decimals });
      }
      return num.toLocaleString();
   }
}
