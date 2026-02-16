export type ChipColor = 'white' | 'red' | 'blue' | 'green' | 'black';

export interface ChipData {
    id: string;
    value: number;
    color: ChipColor;
}
