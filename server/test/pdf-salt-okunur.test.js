// Salt okunur PDF (mezuniyet dilekçesi): düzenleme/kopyalama kapalı, parolasız
// açılır. LibreOffice kurulu değilse test atlanır.
// Çalıştırma (server/ içinden):  node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const docxPdf = require('../lib/docx-pdf');

test('hazır PDF salt okunur hâle gelir', async (t) => {
  if (!(await docxPdf.kullanilabilir())) return t.skip('LibreOffice kurulu değil');
  const { PDFDocument, StandardFonts } = require(
    path.join(__dirname, '..', '..', 'node_modules', 'pdf-lib')
  );
  const doc = await PDFDocument.create();
  const sayfa = doc.addPage([300, 200]);
  sayfa.drawText('Mezuniyet dilekcesi', {
    x: 20,
    y: 150,
    font: await doc.embedFont(StandardFonts.Helvetica),
  });
  const giris = Buffer.from(await doc.save());
  assert.ok(giris.indexOf('/Encrypt') < 0);
  const cikis = await docxPdf.pdfKilitle(giris);
  assert.equal(cikis.slice(0, 4).toString(), '%PDF');
  assert.ok(cikis.indexOf('/Encrypt') >= 0, 'kilitli PDF izin sözlüğü taşımalı');
});

test('PDF olmayan girdi reddedilir', async () => {
  await assert.rejects(docxPdf.pdfKilitle(Buffer.from('merhaba')), (e) => e.durum === 400);
  await assert.rejects(
    docxPdf.docxPdfCevir(Buffer.from('merhaba'), { saltOkunur: true }),
    (e) => e.durum === 400
  );
});
