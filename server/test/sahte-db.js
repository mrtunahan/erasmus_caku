// ══════════════════════════════════════════════════════════════
// TEST İÇİN BELLEKTE MONGO — yalnız yazma/okuma kurallarının kullandığı kadarı.
//
// Gerçek MongoDB gerektirmeden /api/db uçlarını uçtan uca çalıştırmak için.
// Desteklenen: eşitlik (noktalı yol, dizi içerme, ObjectId), $in $nin $ne $eq
// $exists $gt $gte $lt $lte $regex $or $and $nor; güncellemede $set $unset
// $inc $setOnInsert $addToSet($each) $push. Desteklenmeyen işleç sessiz
// geçmez: hata fırlatır, test kırmızı yanar.
// ══════════════════════════════════════════════════════════════

const anahtar = (v) => (v && typeof v === 'object' && v._bsontype === 'ObjectId' ? String(v) : v);
const esit = (a, b) => {
  const x = anahtar(a);
  const y = anahtar(b);
  if (x instanceof Date || y instanceof Date) return +new Date(x) === +new Date(y);
  if (x && y && typeof x === 'object' && typeof y === 'object') {
    return JSON.stringify(x) === JSON.stringify(y);
  }
  return x === y || (x != null && y != null && String(x) === String(y) && typeof x === typeof y);
};

function degerler(doc, yol) {
  let simdi = [doc];
  for (const parca of yol.split('.')) {
    const sonraki = [];
    simdi.forEach((d) => {
      if (d == null) return;
      if (Array.isArray(d) && !/^\d+$/.test(parca)) {
        d.forEach((x) => x != null && sonraki.push(x[parca]));
      } else sonraki.push(d[parca]);
    });
    simdi = sonraki;
  }
  return simdi;
}

const duz = (vs) => vs.flatMap((v) => (Array.isArray(v) ? [v, ...v] : [v]));

function kosul(vs, k) {
  if (
    k &&
    typeof k === 'object' &&
    !Array.isArray(k) &&
    !(k instanceof Date) &&
    k._bsontype !== 'ObjectId' &&
    !(k instanceof RegExp) &&
    Object.keys(k).some((x) => x.startsWith('$'))
  ) {
    return Object.entries(k).every(([op, a]) => {
      const tum = duz(vs);
      switch (op) {
        case '$eq':
          return tum.some((v) => esit(v, a));
        case '$ne':
          return !tum.some((v) => esit(v, a));
        case '$in':
          return a.some((x) =>
            x instanceof RegExp
              ? tum.some((v) => typeof v === 'string' && x.test(v))
              : tum.some((v) => esit(v, x))
          );
        case '$nin':
          return !a.some((x) => tum.some((v) => esit(v, x)));
        case '$exists':
          return a ? vs.some((v) => v !== undefined) : vs.every((v) => v === undefined);
        case '$gt':
          return tum.some((v) => v != null && v > a);
        case '$gte':
          return tum.some((v) => v != null && v >= a);
        case '$lt':
          return tum.some((v) => v != null && v < a);
        case '$lte':
          return tum.some((v) => v != null && v <= a);
        case '$regex': {
          const re = a instanceof RegExp ? a : new RegExp(a, k.$options || '');
          return tum.some((v) => typeof v === 'string' && re.test(v));
        }
        case '$options':
          return true;
        case '$size':
          return vs.some((v) => Array.isArray(v) && v.length === a);
        default:
          throw new Error('sahte-db: desteklenmeyen işleç ' + op);
      }
    });
  }
  if (k instanceof RegExp) return duz(vs).some((v) => typeof v === 'string' && k.test(v));
  if (k === null) return vs.every((v) => v == null);
  return duz(vs).some((v) => esit(v, k));
}

function uyar(doc, q) {
  return Object.entries(q || {}).every(([a, k]) => {
    if (a === '$or') return k.some((x) => uyar(doc, x));
    if (a === '$and') return k.every((x) => uyar(doc, x));
    if (a === '$nor') return !k.some((x) => uyar(doc, x));
    if (a.startsWith('$')) throw new Error('sahte-db: desteklenmeyen işleç ' + a);
    return kosul(degerler(doc, a), k);
  });
}

function yaz(doc, yol, deger) {
  const p = yol.split('.');
  let d = doc;
  p.slice(0, -1).forEach((x) => {
    if (d[x] == null || typeof d[x] !== 'object') d[x] = {};
    d = d[x];
  });
  d[p[p.length - 1]] = deger;
}
function oku(doc, yol) {
  return yol.split('.').reduce((d, x) => (d == null ? undefined : d[x]), doc);
}
function sil(doc, yol) {
  const p = yol.split('.');
  const d = oku(doc, p.slice(0, -1).join('.')) || (p.length === 1 ? doc : null);
  if (d) delete d[p[p.length - 1]];
}

const kopya = (v) => (v === undefined ? v : structuredClone(v));

function guncelle(doc, u, ekleme) {
  if (Array.isArray(u)) throw new Error('sahte-db: boru hattı güncellemesi yok');
  const ops = Object.keys(u);
  if (!ops.some((x) => x.startsWith('$'))) {
    Object.keys(doc).forEach((x) => x !== '_id' && delete doc[x]);
    Object.assign(doc, kopya(u));
    return;
  }
  for (const [op, alanlar] of Object.entries(u)) {
    for (const [yol, v] of Object.entries(alanlar)) {
      if (op === '$set') yaz(doc, yol, kopya(v));
      else if (op === '$setOnInsert') {
        if (ekleme) yaz(doc, yol, kopya(v));
      } else if (op === '$unset') sil(doc, yol);
      else if (op === '$inc') yaz(doc, yol, (oku(doc, yol) || 0) + v);
      else if (op === '$push') {
        const l = oku(doc, yol) || [];
        yaz(doc, yol, l.concat(v && v.$each ? v.$each : [v]));
      } else if (op === '$addToSet') {
        const l = oku(doc, yol) || [];
        (v && v.$each ? v.$each : [v]).forEach((x) => {
          if (!l.some((y) => esit(y, x))) l.push(x);
        });
        yaz(doc, yol, l);
      } else throw new Error('sahte-db: desteklenmeyen güncelleme ' + op);
    }
  }
}

class Imlec {
  constructor(l) {
    this.l = l;
  }
  sort(s) {
    const [[a, yon]] = Object.entries(s || { _id: 1 });
    this.l = this.l
      .slice()
      .sort((x, y) => (oku(x, a) > oku(y, a) ? yon : oku(x, a) < oku(y, a) ? -yon : 0));
    return this;
  }
  limit(n) {
    if (n) this.l = this.l.slice(0, n);
    return this;
  }
  skip(n) {
    this.l = this.l.slice(n || 0);
    return this;
  }
  project() {
    return this;
  }
  batchSize() {
    return this;
  }
  async toArray() {
    return this.l.map(kopya);
  }
  async next() {
    return this.l.length ? kopya(this.l.shift()) : null;
  }
}

let sayac = 0;
class Koleksiyon {
  constructor() {
    this.belgeler = [];
  }
  find(q) {
    return new Imlec(this.belgeler.filter((d) => uyar(d, q)));
  }
  async findOne(q) {
    const d = this.belgeler.find((x) => uyar(x, q));
    return d ? kopya(d) : null;
  }
  async countDocuments(q) {
    return this.belgeler.filter((d) => uyar(d, q)).length;
  }
  async insertOne(d) {
    const b = { _id: d._id !== undefined ? d._id : 'oid' + ++sayac, ...kopya(d) };
    this.belgeler.push(b);
    return { insertedId: b._id, acknowledged: true };
  }
  async insertMany(l) {
    for (const d of l) await this.insertOne(d);
    return { acknowledged: true };
  }
  async updateOne(q, u, o = {}) {
    const d = this.belgeler.find((x) => uyar(x, q));
    if (d) {
      guncelle(d, u, false);
      return { matchedCount: 1, modifiedCount: 1 };
    }
    if (!o.upsert) return { matchedCount: 0, modifiedCount: 0 };
    const yeni = {};
    Object.entries(q).forEach(([a, v]) => {
      if (!a.startsWith('$') && (v === null || typeof v !== 'object' || v._bsontype))
        yaz(yeni, a, v);
    });
    guncelle(yeni, u, true);
    if (yeni._id === undefined) yeni._id = 'oid' + ++sayac;
    this.belgeler.push(yeni);
    return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: yeni._id };
  }
  async replaceOne(q, d, o) {
    return this.updateOne(q, d, o);
  }
  async updateMany(q, u) {
    const l = this.belgeler.filter((x) => uyar(x, q));
    l.forEach((d) => guncelle(d, u, false));
    return { matchedCount: l.length, modifiedCount: l.length };
  }
  async deleteOne(q) {
    const i = this.belgeler.findIndex((x) => uyar(x, q));
    if (i >= 0) this.belgeler.splice(i, 1);
    return { deletedCount: i >= 0 ? 1 : 0 };
  }
  async deleteMany(q) {
    const once = this.belgeler.length;
    this.belgeler = this.belgeler.filter((x) => !uyar(x, q));
    return { deletedCount: once - this.belgeler.length };
  }
  async findOneAndUpdate(q, u, o = {}) {
    await this.updateOne(q, u, o);
    return this.findOne(q);
  }
  aggregate() {
    return new Imlec([]);
  }
  async createIndex() {}
  async distinct(a, q) {
    return [...new Set(this.belgeler.filter((d) => uyar(d, q)).flatMap((d) => duz([oku(d, a)])))];
  }
}

class SahteDb {
  constructor() {
    this.k = new Map();
  }
  collection(ad) {
    if (!this.k.has(ad)) this.k.set(ad, new Koleksiyon());
    return this.k.get(ad);
  }
  async command() {
    return { ok: 1 };
  }
  admin() {
    return { command: async () => ({ ok: 1 }) };
  }
  async listCollections() {
    return { toArray: async () => [...this.k.keys()].map((name) => ({ name })) };
  }
}

module.exports = { SahteDb, uyar };
