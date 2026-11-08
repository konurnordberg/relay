import catalog from '../dist/data/environment-catalog.json' with {type:'json'};
export const CATALOG_OWNER='__relay_builtin_catalog__';
export const catalogDocuments=catalog;
// Shared, immutable starting environments, authorized for this owner-private Site.
// No user-supplied documents or ownership changes are accepted by this operation.
export async function ensureCatalog(db){
 await db.batch([
 db.prepare('DELETE FROM environment_votes WHERE environment_id=? AND EXISTS (SELECT 1 FROM environments WHERE id=? AND owner=?)').bind('relay-builtin-dial-v1','relay-builtin-dial-v1',CATALOG_OWNER),
 db.prepare('DELETE FROM environments WHERE id=? AND owner=?').bind('relay-builtin-dial-v1',CATALOG_OWNER),
 ...catalog.map(doc=>db.prepare('INSERT INTO environments (id,owner,document,revision,published_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(doc.id,CATALOG_OWNER,JSON.stringify(doc),doc.revision,doc.createdAt,doc.updatedAt))]);
 return catalog.map(doc=>({id:doc.id,name:doc.name,author:doc.author}));
}
