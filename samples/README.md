# Sample bill outputs

Rendered with `printService.generateInvoiceHtml()` from this repo — open them in a browser
(or print to PDF) to see exactly what the app produces.

| File | What it shows |
|---|---|
| `bill_of_supply_non_gst.html` | **Non-GST bill** (`bill_type = 'non_gst'`, supply type *intra-state*) for a **walk-in customer** saved with a name only: title `BILL OF SUPPLY — Not a Tax Invoice`, buyer GSTIN reads *Unregistered buyer*, no GST column, no CGST/SGST/IGST rows, HSN table becomes a **value** summary, `GST: Not applicable (Non-GST bill)` and a “no GST has been charged” declaration. |
| `tax_invoice_gst.html` | The same firm and items as a normal **GST tax invoice** (`bill_type = 'gst'`, `gst_type = 'auto'`, intra-state Maharashtra buyer) with the GST column, CGST + SGST split and the HSN/SAC **tax** summary. |

Supply-type variants that do not change the layout but do change the labels:

- Non-GST + `inter` → “Non-GST · Inter-state supply”, still zero tax.
- Non-GST + `nil` → “Non-GST · Nil / Exempt supply”, still zero tax.
- GST invoice + `gst_type = 'nil'` → title `TAX INVOICE (NIL / EXEMPT)`, no tax rows, excluded from
  GSTR-1 / HSN Table 12 like a bill of supply.
