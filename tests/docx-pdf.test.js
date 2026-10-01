import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { docxPdfCevir } = require('../server/lib/docx-pdf.js');

describe('docxPdfCevir', () => {
  // LibreOffice kurulu olsun olmasın: geçersiz girdi çeviriciye hiç gitmez.
  it('docx olmayan girdiyi 400 ile reddeder', async () => {
    await expect(docxPdfCevir(Buffer.from('%PDF-1.4'))).rejects.toMatchObject({ durum: 400 });
    await expect(docxPdfCevir(null)).rejects.toMatchObject({ durum: 400 });
  });
});
