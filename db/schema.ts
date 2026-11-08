import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const environments=sqliteTable('environments',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),document:text('document').notNull(),revision:integer('revision').notNull(),publishedAt:text('published_at').notNull(),updatedAt:text('updated_at').notNull()
},table=>[index('environments_owner').on(table.owner),index('environments_published').on(table.publishedAt)]);
export const votes=sqliteTable('environment_votes',{
 environmentId:text('environment_id').notNull().references(()=>environments.id,{onDelete:'cascade'}),userId:text('user_id').notNull(),value:integer('value').notNull()
},table=>[primaryKey({columns:[table.environmentId,table.userId]})]);
