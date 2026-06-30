import initialMigration from './migrations/001_initial.sql?raw'

export interface DatabaseMigration {
  version: number
  name: string
  sql: string
}

export const migrations: DatabaseMigration[] = [
  {
    version: 1,
    name: '001_initial',
    sql: initialMigration,
  },
]
