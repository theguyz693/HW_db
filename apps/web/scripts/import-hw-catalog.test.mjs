import { describe, expect, it } from 'vitest';
import { parseTables } from './import-hw-catalog.mjs';

// Trimmed from the real "List of 2024 Hot Wheels" wikitext, including its quirks:
// unclosed style quotes in headers, bgcolor cell attributes, piped links, <font>, variants.
const WIKITEXT = `==2024 Hot Wheels #1-250==
Intro text.
{| class="sortable wikitable" style="font-size: 85%;" width="100%"
|-
! style="border-style: none none solid solid; |Toy #
! style="border-style: none none solid solid; |Col.#
! style="border-style: none none solid solid; |Model Name
! style="border-style: none none solid solid; |Series
! style="border-style: none none solid solid; |Series #
! style="border-style: none none solid solid; |Photo
|-
|HRY51
|001
|[[Mazda Autozam]]
|bgcolor="grey"|[[HW Dream Garage Mini Collection (2024)|<font color="black">HW Dream Garage</font>]]<br>'''[[2024 New Models|<font color="black">New for 2024!</font>]]'''
|3/5
|[[File:TexasToot.jpg|center|75px]]
|-
|HTC83
|002
|[[Batman v Superman Batmobile|Batmobile]] (2nd Color)
|bgcolor="black"|[[Batman Mini Collection (2024)|<font color="white">Batman</font>]]
|1/5
|[[File:PXL 20240406 231949889.jpg|center|75px]]
|-
|not a code
|003
|Broken row
|x
|1/1
|
|}`;

describe('parseTables', () => {
  const rows = parseTables(WIKITEXT, 2024);

  it('parses valid rows and skips malformed ones', () => {
    expect(rows.map((r) => r.toy)).toEqual(['HRY51', 'HTC83']);
  });

  it('cleans links, formatting and cell attributes', () => {
    expect(rows[0]).toMatchObject({
      toy: 'HRY51',
      col: '1',
      name: 'Mazda Autozam',
      variant: '',
      series: 'HW Dream Garage',
      seriesNum: '3/5',
      year: 2024,
      isNew: true,
      file: 'TexasToot.jpg',
    });
  });

  it('uses link display text and splits out the variant', () => {
    expect(rows[1]).toMatchObject({ name: 'Batmobile', variant: '2nd Color', series: 'Batman', isNew: false });
  });
});
