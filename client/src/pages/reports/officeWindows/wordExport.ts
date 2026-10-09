import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { longDate } from '@/utils/dates';
import type { ReportAssets, ReportImage } from '@/utils/reportImages';
import { reportTitle } from './reportRows';
import type { ReportRow } from './reportRows';

type ParagraphAlignment = (typeof AlignmentType)[keyof typeof AlignmentType];

const FONT = 'Calibri';
// Dark blue to match the XLSX export; very light grey for alternating rows.
const HEADER_FILL = '1D4ED8';
const ALT_FILL = 'F8FAFC';
// 0.08" in twips, ~1.7mm of padding inside every cell.
const CELL_PAD = 120;
const CELL_MARGINS = { top: CELL_PAD, bottom: CELL_PAD, left: CELL_PAD, right: CELL_PAD };
const NUMERIC_WIDTH = 20;
const ICON_PT = 14;
// Bounded by roughly the title (16pt) plus date (12pt) block combined.
const MAX_LOGO_HEIGHT = 60;

const DOC_STYLES = {
  paragraphStyles: [
    {
      id: 'headerTitle',
      name: 'Header Title',
      run: { font: FONT, size: 32, bold: true },
      paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 120 } },
    },
    {
      id: 'tableTitle',
      name: 'Table Title',
      run: { font: FONT, size: 24, bold: false },
      paragraph: { spacing: { after: 60 } },
    },
    {
      id: 'tableHeader',
      name: 'Table Header',
      run: { font: FONT, size: 22, bold: true },
      paragraph: { spacing: { after: 0 } },
    },
    {
      id: 'tableCell',
      name: 'Table Cell',
      run: { font: FONT, size: 22, bold: false },
      paragraph: { spacing: { after: 0 } },
    },
  ],
};

const percent = (size: number) => ({ size, type: WidthType.PERCENTAGE });

const shaded = (fill: string) => ({
  shading: { type: ShadingType.SOLID, color: fill, fill },
  margins: CELL_MARGINS,
});

const headerCell = (text: string, width: number, alignment: ParagraphAlignment) =>
  new TableCell({
    children: [
      new Paragraph({
        alignment,
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 22, font: FONT })],
      }),
    ],
    width: percent(width),
    ...shaded(HEADER_FILL),
  });

const dataCell = (
  text: string,
  width: number,
  alignment: ParagraphAlignment,
  fill: string,
  bold = false
) =>
  new TableCell({
    children: [
      new Paragraph({ alignment, children: [new TextRun({ text, bold, size: 22, font: FONT })] }),
    ],
    width: percent(width),
    ...shaded(fill),
  });

interface TableLayout {
  productWidth: number;
  showLicenses: boolean;
  withAvailable: boolean;
}

const headerRow = ({ productWidth, showLicenses, withAvailable }: TableLayout) => {
  const cells = [
    headerCell('Product', productWidth, AlignmentType.LEFT),
    headerCell('Installs', NUMERIC_WIDTH, AlignmentType.CENTER),
  ];
  if (showLicenses) {
    cells.push(headerCell('Licenses', NUMERIC_WIDTH, AlignmentType.CENTER));
    if (withAvailable) cells.push(headerCell('Available', NUMERIC_WIDTH, AlignmentType.CENTER));
  }
  return new TableRow({ children: cells, tableHeader: true });
};

const dataRow = (
  row: ReportRow,
  index: number,
  { productWidth, showLicenses, withAvailable }: TableLayout
) => {
  const fill = index % 2 === 0 ? ALT_FILL : 'FFFFFF';
  const bold = !!row.isGroup;
  // Word has no indent-by-cell, so nested variants are prefixed with an en
  // space pair to sit visually under their family heading.
  const label = row.isChild ? `  ${row.name}` : row.name;
  const cells = [
    dataCell(label, productWidth, AlignmentType.LEFT, fill, bold),
    dataCell(String(row.installs ?? ''), NUMERIC_WIDTH, AlignmentType.CENTER, fill, bold),
  ];
  if (showLicenses) {
    cells.push(dataCell(row.license || '', NUMERIC_WIDTH, AlignmentType.CENTER, fill));
    if (withAvailable) {
      cells.push(dataCell(row.available || '', NUMERIC_WIDTH, AlignmentType.CENTER, fill));
    }
  }
  return new TableRow({ children: cells });
};

const sectionTitle = (title: string, icon: ReportImage | null) => {
  const children: (ImageRun | TextRun)[] = [];
  if (icon) {
    children.push(
      new ImageRun({
        data: icon.bytes,
        transformation: { width: ICON_PT, height: ICON_PT },
        type: 'png',
      })
    );
    children.push(new TextRun({ text: '  ' }));
  }
  children.push(new TextRun({ text: title, bold: true, size: 28, font: FONT }));
  return new Paragraph({ spacing: { before: 240, after: 120 }, children });
};

// withAvailable: the Office table carries a fourth "Available" column; the
// Windows table keeps the original three.
const buildTable = (
  title: string,
  rows: ReportRow[],
  icon: ReportImage | null,
  showLicenses: boolean,
  withAvailable: boolean
) => {
  const extraCols = showLicenses ? (withAvailable ? 2 : 1) : 0;
  const layout: TableLayout = {
    productWidth: 100 - NUMERIC_WIDTH * (1 + extraCols),
    showLicenses,
    withAvailable,
  };
  return [
    sectionTitle(title, icon),
    new Table({
      rows: [headerRow(layout), ...rows.map((row, i) => dataRow(row, i, layout))],
      width: percent(100),
    }),
    new Paragraph({ spacing: { after: 120 } }),
  ];
};

const logoParagraph = (logo: ReportImage) => {
  const height = Math.min(MAX_LOGO_HEIGHT, logo.height);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new ImageRun({
        data: logo.bytes,
        type: 'png',
        transformation: { width: Math.round(height * (logo.width / logo.height)), height },
      }),
    ],
  });
};

const titleBlock = (agencyName: string, logo: ReportImage | null) => [
  ...(logo ? [logoParagraph(logo)] : []),
  new Paragraph({ text: reportTitle(agencyName), style: 'headerTitle' }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: longDate(), font: FONT, size: 24, bold: false })],
  }),
];

export interface OfficeWindowsDocxInput {
  agencyName: string;
  officeRows: ReportRow[];
  osRows: ReportRow[];
  showLicenses: boolean;
  /** Icons and logo already loaded; any missing image is left out of the document. */
  assets: ReportAssets;
}

export const buildOfficeWindowsDocx = ({
  agencyName,
  officeRows,
  osRows,
  showLicenses,
  assets,
}: OfficeWindowsDocxInput): Promise<Blob> => {
  const doc = new Document({
    styles: DOC_STYLES,
    sections: [
      {
        children: [
          ...titleBlock(agencyName, assets.logo ?? null),
          ...buildTable('Office', officeRows, assets.officeIcon ?? null, showLicenses, true),
          ...buildTable(
            'Windows Installs',
            osRows,
            assets.windowsIcon ?? null,
            showLicenses,
            false
          ),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
};
