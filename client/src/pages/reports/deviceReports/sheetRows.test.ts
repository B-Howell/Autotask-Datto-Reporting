import { describe, expect, it } from 'vitest';
import { mergeSheets, selectColumns } from './sheetRows';

const sheet = [
  ['Product', 'Reference Name', 'Department'],
  ['Laptop', 'HPH-LT-0001', 'IT'],
];

describe('sheetRows', () => {
  it('stacks member sheets under one header and tags rows with the company', () => {
    const { header, rows, editableCols } = mergeSheets([
      { sheet, ids: [50001], companyName: 'Harbor Point' },
      { sheet, ids: [50002], companyName: 'Harbor Point Annex' },
    ]);
    expect(header).toEqual(sheet[0]);
    expect(rows.map((r) => [r.company, r.autotaskId])).toEqual([
      ['Harbor Point', 50001],
      ['Harbor Point Annex', 50002],
    ]);
    expect(editableCols).toEqual({ Department: 'col2' });
  });

  it('selects export columns by header name, in the requested order', () => {
    const cols = selectColumns(sheet[0]!, ['Department', 'Product', 'Not A Column']);
    expect(cols.map((c) => [c.field, c.headerName])).toEqual([
      ['col2', 'Department'],
      ['col0', 'Product'],
    ]);
  });
});
