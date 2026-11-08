import catalog from '../dist/data/environment-catalog.json' with {type:'json'};
export const CATALOG_OWNER='__relay_builtin_catalog__';
export const catalogDocuments=catalog;
// Shared, immutable starting environments for the public feed.
// No user-supplied documents or ownership changes are accepted by this operation.
export async function ensureCatalog(db){
 await db.batch([
 db.prepare('DELETE FROM environment_votes WHERE environment_id=? AND EXISTS (SELECT 1 FROM environments WHERE id=? AND owner=?)').bind('relay-builtin-dial-v1','relay-builtin-dial-v1',CATALOG_OWNER),
 db.prepare('DELETE FROM environments WHERE id=? AND owner=?').bind('relay-builtin-dial-v1',CATALOG_OWNER),
 ...catalog.map(doc=>db.prepare('INSERT INTO environments (id,owner,document,revision,published_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(doc.id,CATALOG_OWNER,JSON.stringify(doc),doc.revision,doc.createdAt,doc.updatedAt)),
 // The six owner-authored starter examples are explicitly included in the public launch.
 // Only those reserved records are upgraded; private user packages remain private.
 ...catalog.map(doc=>db.prepare("UPDATE environments SET document=json_set(document,'$.license',?,'$.revision',MAX(revision,?)),revision=MAX(revision,?) WHERE id=? AND owner=? AND json_extract(document,'$.license')='private'").bind(doc.license,doc.revision,doc.revision,doc.id,CATALOG_OWNER))]);
 return catalog.map(doc=>({id:doc.id,name:doc.name,author:doc.author}));
}
