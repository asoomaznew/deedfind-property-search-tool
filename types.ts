
export interface DeedEntry {
  municipalityTitleDeed?: string | null; //  Plot
  hajryPlotNumber?: string | null; // Municipality / Title Deed (Plot) in results table for non-full view
  mazaya?: string | null; // Displayed as "Hajry" in results table, used for "Mazaya (Column) Value" search & Excel Col 1
  title?: string | null; // Displayed as "Mazaya" in results table, Used for Excel Col 3
  referenceDeed?: string | null;
  buildingNo?: string | null;
}

export type SearchType = 'hajryOnly' | 'hajrySearch' | 'hajryAndBuilding' | 'mazayaSearch' | 'excelFile';
export type TableViewType = 'compact' | 'full';

// Generic props for Lucide icons if we were to pass them as props
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: string | number;
  color?: string;
}
