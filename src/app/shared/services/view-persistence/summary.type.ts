import { ViewElement } from '../../model/view-config/view-element.type';

export interface Summary extends ViewElement {
   empty: string; // not used but required (marker interface without property not allowed)
}
