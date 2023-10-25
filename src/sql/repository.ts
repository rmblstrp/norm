import { TypedConstructable } from "@elevated/objects/lib/types";
import * as Knex from "knex";
import { isNil } from "lodash";
import { DatabaseType } from "../configuration";
import { Criteria } from "../criteria";
import { EntityKeyGenerator } from "../entity";
import { DatabaseRepository, QueryOptions, SaveOptions } from "../repository";
import { factory } from "./client";
import { SqlQuery } from "./query";

export abstract class SqlRepository<E, PK> extends DatabaseRepository<E, PK> {
    protected writeBuilder: Knex;
    protected readBuilder: Knex;

    constructor(database: DatabaseType, classType: TypedConstructable<E>, connectionName?: string) {
        super(database, classType, connectionName);

        this.writeBuilder = factory(this.type, { name: connectionName, master: true });
        this.readBuilder = factory(this.type, { name: connectionName });
    }

    public async exists(entity: E | PK, options?: QueryOptions): Promise<boolean> {
        const hasPrimaryKeyValue = this.primaryKeyHasValue(entity);

        if (hasPrimaryKeyValue) {
            const generator = this.descriptor.primaryKey.generator;
            if (generator !== EntityKeyGenerator.None && !QueryOptions.ignoreGenerator(options)) {
                return true;
            }

            return this.getPrimaryKeyQuery(this.getBuilder(options), entity)
                .select()
                .count(`${this.primaryKey} as cnt`)
                .then<boolean>(rows => (parseInt(rows[0].cnt) === 1));
        }

        return false;
    }

    public async delete(entity: E | PK, options?: SaveOptions): Promise<void> {
        return this.getPrimaryKeyQuery(this.writeBuilder, entity).delete();
    }

    public async get(id: E | PK, options?: QueryOptions): Promise<E> {
        if (!this.primaryKeyHasValue(id)) {
            return undefined;
        }

        const row = await this.getPrimaryKeyQuery(this.getBuilder(options), id)
            .select()
            .then<object>(rows => (rows.length === 1 ? rows[0] : undefined));

        return this.convert(row);
    }

    public async query(criteria: Criteria, options?: QueryOptions): Promise<E[]> {
        const query = SqlQuery.generate(this.getBuilder(options)(this.table), criteria, this.settings);

        const entities: E[] = [];
        const rows = await query.then<object[]>(rows => rows);

        for (const item of rows) {
            entities.push(this.convert(item));
        }

        return entities;
    }

    public async updateQuery(entity: E, criteria: Criteria, options?: SaveOptions): Promise<void> {
        // const builder = this.getBuilder({useMaster: true})(this.table);
        // const query = SqlQuery.generate(builder, criteria, this.settings);
    }

    protected async insert(entity: E, options?: SaveOptions): Promise<void> {
        await this.writeBuilder(this.table)
            .insert(this.getValues(entity))
            .returning(this.primaryKey)
            .then(id => {
                if (isNil(entity[this.descriptor.primaryKey.name])) {
                    const insertId = {};
                    insertId[this.descriptor.primaryKey.name] = id[0];

                    this.descriptor.apply<E, object>(entity, insertId, this.descriptor.casing, this.descriptor.casing);
                }
            });
    }

    protected async update(entity: E, options?: SaveOptions): Promise<void> {
        return this.getPrimaryKeyQuery(this.writeBuilder, entity).update(this.getValues(entity, false));
    }

    protected getBuilder(options?: QueryOptions): Knex {
        if (QueryOptions.useMaster(options)) {
            return this.writeBuilder;
        }

        return this.readBuilder;
    }

    protected getPrimaryKeyQuery(builder: Knex, entity: E | PK): Knex.QueryBuilder {
        return builder(this.table).where(this.getPrimaryKeyObject(entity)).limit(1);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ---------------------------------------------------------------------------------------------------------------------
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class MysqlRepository<E, PK> extends SqlRepository<E, PK> {
    constructor(classType: TypedConstructable<E>, connectionName?: string) {
        super(DatabaseType.Mysql, classType, connectionName);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ---------------------------------------------------------------------------------------------------------------------
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export class PostgresRepository<E, PK> extends SqlRepository<E, PK> {
    constructor(classType: TypedConstructable<E>, connectionName?: string) {
        super(DatabaseType.Postgres, classType, connectionName);
    }
}
