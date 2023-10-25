# nORM: The node-ORM

nORM was conceived to be a data mapper-like ORM that allows entities to be extremely configurable and stored in a variety of different data stores. Changing the backing data store requires little to no refactoring.  The fields of an entity are customizable so an entity doesn't have store the same information across data stores.  Currently PostgresSQL, MySQL, and DynamoDB have been implemented with plans to add Algolia, Firebase, and other compatible data stores.

# Usage

## Class Decorators

Decorators are applied from the bottom up starting with the decorator that immediately precedes the the class definition statement.  For this reason, the ***@entity*** decorator must be the last one specified because it is used to close the entity specification

### @entity(“table”)

```typescript
@entity("my_user")
class User {
}
```

**REQUIRED:** The table name can be specified with any form of casing since it will be converted the casing specified for a particular database configuration.  Examples “my-user”, “myUser”, “TioUser”, “My User”.

### @entity()

```typescript
@entity()
class User {
}
```

**REQUIRED:** If the table name isn't specified then the class name will be used instead.

### @Inherit

```typescript
@inherit
class User {
}
```

**REQUIRED if @entity() is not used:** This decorator will complete the entity specification and use the table name and data specifications of its parent class.

### @schema(“Name”)

```typescript
@entity()
@schema("my-user")
class User {
}
```

**OPTIONAL:** This specifies the schema name to be prefixed to the table name if specified in the database config.  Example: “my_user.user”

### @connection(“name” [, DatabaseType])

```typescript
@entity()
@connection("flatten")
class User {
}

@entity()
@connection("flattenRelationDepth", DatabaseType.DynamoDB)
class User {
}
```

**OPTIONAL:** This specifies the connection that will be used by the repositories when storing/retrieving the entity to/from a database.

### @source(DatabaseType)

```typescript
@entity()
@source(DatabaseType.Postgres)
class User {
}
```

**OPTIONAL:** This specifies the database that is the source of truth for an entity.  Typically this will be a SQL database.  The source database as of right now is only used by the *EntityRepository* class.

### @cache(...DatabaseType)

```typescript
@entity()
@cache(DatabaseType.DynamoDB)
class User {
}
```

**OPTIONAL:** This specifies the cache databases for an entity.  The cache databases as of right now are only used by the *EntityRepository* class.

### @casing(StringCase)

```typescript
@entity()
@casing(StringCase.Snake)
class User {
    public first_name: string;
}
```

**OPTIONAL:** This specifies the case type used for properties/field on the class.  If this decorator is not used, then the class will be assumed to use camel casing.

## Property Decorators

### @primaryKey

```typescript
@entity()
class User {
    @primaryKey
    public id: number;
}
```

**REQUIRED:** Every entity class must have a single primary key column.  Depending of the the @generator, the database will be queried to see if the primary key value already exists.  If it does an update will be performed otherwise an insert will be attempted.

### @generator(EntityKeyGenerator)

```typescript
@entity()
class User {
    @generator(EntityKeyGenerator.Identity)
    @primaryKey
    public id: number;
}
```

**OPTIONAL:** Use the generator decorator for primary key's that must be generated before being saved.

* Identity will set the id property to the id value returned when the entity is saved in a SQL database
* Guid will automatically generate a UUID value if one isn't set before the object saved to the database

### @column

```typescript
@entity()
class User {
    @primaryKey
    public id: number;

    @column
    public firstName: string;
}
```

**REQUIRED:** This is a required decorator if the property/field is to be saved or retrieved from a database.  Not all properties/fields on a class are required to be columns.

### @exclude(...DatabaseType)

```typescript
@entity()
class User {
    @primaryKey
    public id: number;

    @column
    public firstName: string;

    @exclude(DatabaseType.Firebase, DatabaseType.Algolia)
    @column
    public lastName: string;
}
```

**OPTIONAL:** When a field is stored/retrieved then this column will be excluded from those operations for the specified database types.

### @only(...DatabaseType)

```typescript
@entity()
class User {
    @primaryKey
    public id: number;

    @column
    public firstName: string;

    @only(DatabaseType.Postgres, DatabaseType.DynamoDB)
    @column
    public lastName: string;
}
```

**OPTIONAL:** This decorator is the inverse of *@exclude*.  This specifies the database types this column will only be included when a field is stored/retrieved.

### @index(“name”)

```typescript
@entity()
class User {
    @primaryKey
    public id: number;

    @column
    public firstName: string;

    @index("lastName-index")
    @column
    public lastName: string;
}
```

**OPTIONAL:** As of right now this decorator is only used when generating DynamoDB queries so that the correct index can be applied when doing a query or scan.


### @relatesTo(Entity)

```typescript
@entity()
class User {
    @primaryKey
    public id: number;

    @column
    public firstName: string;

    @column
    public lastName: string;
}

@entity()
class PhoneNumber {
    @primaryKey
    public id: number;

    @column
    public number: string;

    @relatesTo(User)
    @column
    public userId: number;
}
```

**OPTIONAL:** This specifies that column *userId* relates to the *User* object.  At this level the primary reason for specified the relation is to enable *joins* in criteria queries to work correctly.

```typescript
@entity()
class User {
    @primaryKey
    public id: number;

    @column
    public firstName: string;

    @column
    public lastName: string;
}

@entity()
class PhoneNumber {
    @primaryKey
    public id: number;

    @column
    public number: string;

    @relatesTo(User)
    @column
    public user: User;
}
```

**OPTIONAL:** When an entity class type is used then the behavior for storing/retrieving the related entity information becomes dependent upon the database connection settings.  If relation depth is zero then only the primary key value of *User* will be used and the column will effectively become *userId* and then cased accordingly for the database.  If relation depth is greater than zero, then the related object will be flattened for SQL databases without having to have the *flatten* setting specified in the configuration.  Otherwise when the relation depth is greater than zero, the class will stored/retrieved as a document.

### @timestamp(EVENT)

```typescript
@entity()
class User {
    @primaryKey
    public id: number;

    @column
    public firstName: string;

    @timestamp(TimestampEvent.OnCreate)
    @column
    public createdAt: Date;

    @timestamp(TimestampEvent.OnUpdate)
    @column
    public updatedAt: Date;

    @timestamp(TimestampEvent.OnDelete)
    @column
    public deletedAt: Date;
}
```

**OPTIONAL:** These columns will have their values automatically set when being stored and based upon whether the value is being inserted or updated.

## Entity Inheritance

Entities can inherit from other entities and will have their own entity descriptor with most information copied from the parent.

Entity information inherited from parent:

* Schema
* Primary key
* Columns
* Timestamps
* Casing
* Connections

```typescript
@entity()
class User {
    @primaryKey
    public id: number;

    @column
    public firstName: string;

    @timestamp(TimestampEvent.OnCreate)
    @column
    public createdAt: Date;

    @timestamp(TimestampEvent.OnUpdate)
    @column
    public updatedAt: Date;
}

@entity
class UserEmail extends User {
    @column
    public email: string;
}
```

# Database

## Configuration

### Settings

```typescript
let configuration: DatabaseConfiguration = {
    name: DatabaseClientFactory.DefaultName,
    type: DatabaseType.Unspecified,
    settings: {
        flatten: { separator: "_", keyStyle: StringCase.Camel },
        relationDepth: 1,
        
        columnCasing: StringCase.Snake,
        schemaCasing: StringCase.Snake,
        tablecasing: StringCase.Snake,
        useSchema: false
    }
}
```

* Flatten specifies the settings that are used to turn a relation hierarchy into a flat row of key/value pairs
    * Separator is the character(s) used to delimit between the parent and child key
    * Optional: Key style denotes the string case style to use for each key in the hierarchy.  If key style is not specified, then the value will be used without modification.
* Relation depth specifies how deep man relations deep to go before saving a document to the database
    * This can be used in combination with flattening and is most useful in SQL databases
* Column, Schema, and Table casing specifies the casing for those identifiers in a particular database configuration
    * Default casing is snake case
* Use schema is a boolean values which specifies if a table name should be qualified with the schema value
    * Default value is false

### SQL Databases

```typescript
let configuration: DatabaseConfiguration = {
    name: DatabaseClientFactory.DefaultName,
    type: DatabaseType.Postgres,
    master: {
        host: "127.0.0.1"
    },
    readonly: [
        { host: "127.0.0.1" }
    ]
    username: "root",
    password: "",
    database: "norm"
}
```

### AWS DynamoDB

```typescript
let configuration: DatabaseConfiguration = {
    name: DatabaseClientFactory.DefaultName,
    type: DatabaseType.DynamoDB,
    username: "access-key-id",
    password: "secret-access-key",
    database: "us-east-1",
    options: {convertEmptyValues: true},
    settings: {
        columnCasing: StringCase.Camel,
        tableCasing: StringCase.Pascal
    }
};
```

* Options can be provided which will be used when creating an instance of the document client
* Setting the *master* property will allow use of a local instance of DynamoDB

### Algolia Search

```typescript
let configuration: DatabaseConfiguration = {
    name: DatabaseClientFactory.DefaultName,
    type: DatabaseType.Algolia,
    username: "application-id",
    password: "api-key"
};
```

## Repositories

### Repository Interface

This is the interface that all repository classes will implement.  The generic type parameters specify the entity and primary key data types.

```typescript
interface Repository<EntityType, PrimaryKeyType> {
    delete(entity: EntityType | PrimaryKeyType, options?: SaveOptions): Promise<void>;

    exists(entity: EntityType | PrimaryKeyType, options?: QueryOptions): Promise<boolean>;

    get(id: EntityType | PrimaryKeyType, options?: QueryOptions): Promise<EntityType>;

    query(criteria: Criteria, options?: QueryOptions): Promise<EntityType[]>;

    save(entity: EntityType, options?: SaveOptions): Promise<void>;
}
```

**Query Options**

```typescript
class QueryOptions {
    useMaster?: boolean; // forces a query to use master instead of read-only instances
}
```

Save Options

```typescript
class SaveOptions {
    overwrite?: boolean; // only used in Algolia update operation
}
```

### MySql Repository

```typescript
let userRepository = new MysqlRepository<User, number>(User);
let phoneNumberRepository = new MysqlRepository<PhoneNumber, number>(PhoneNumber);
```

### Postgres Repository

```typescript
let userRepository = new PostgresRepository<User, number>(User);
let phoneNumberRepository = new PostgresRepository<PhoneNumber, number>(PhoneNumber);
```

### Dynamo Repository

```typescript
let userRepository = new DynamoRepository<User, number>(User);
let phoneNumberRepository = new DynamoRepository<PhoneNumber, number>(PhoneNumber);
```

### Algolia Repository

```typescript
let userRepository = new AlgoliaRepository<User, number>(User);
let phoneNumberRepository = new AlgoliaRepository<PhoneNumber, number>(PhoneNumber);
```

### Entity Repository

```typescript
let userRepository = new EntityRepository<User, number>(User);
let phoneNumberRepository = new EntityRepository<PhoneNumber, number>(PhoneNumber);
```

The entity repository is a special implementation of the *Repository* interface.  It does not performs operations on a specific database, but instead uses specific database repositories specified by the entity.

For any query operation, the entity repository will first query the cache repositories in the order they were specified.  If the entity was not found in cache, then it will query the source database repository and return the result.

For any insert/update/delete operation, the source database will operated on first.  If the operation was successful, then the cache databases will be updated according to the specified operation.

## Criteria Queries

Criteria queries are a way of performing a database agnostic query.  They take the structure of SQL queries, but are then translated to a query for the target database.

### Criteria Object

This is the only object that is required for a criteria query.  It accepts the entity type that is to be queried.  All method calls on this object return *this* so that they can be called in a fluent manner.

```
let criteria = new Criteria(PhoneNumber)
    .startAt(10)
    .limit(20);
```

### Criteria Where Value

This object specifies a where type clause condition.  It needs the entity property name and comparison value at a minimum.  The comparison condition and clause evaluation can be optionally specified.  The default comparison is for the clause to be *equal* as well evaluated as an *and* condition.

```typescript
// Equal Comparison
let criteria = new Criteria(PhoneNumber)
    .where(new CriteriaWhereValue("number", "555-555-555"));

// Not Equal Comparison
let criteria = new Criteria(PhoneNumber)
    .where(new CriteriaWhereValue("number", "555-555-555", {comparison: CriteriaComparison.NotEqual}));
    
// OR Evaluation
let criteria = new Criteria(PhoneNumber)
    .where(new CriteriaWhereValue("number", "555-555-555"))
    .where(new CriteriaWhereValue("number", "555-555-555", {evaluation: CriteriaEvaluation.Or}));

// IN Comparison
let criteria = new Criteria(PhoneNumber)
    .where(new CriteriaWhereValue("id", [1,2,3], {comparison: CriteriaComparison.In}));
```

### Criteria Where Group

This object allows a where group to be added to the where clause.  A criteria where group automatically evaluates using an *or* condition.

```typescript
let criteria = new Criteria(PhoneNumber)
    .where(new CriteriaWhereValue("id", 1))
    .where(new CriteriaWhereGroup() // Evaluation is OR by default
        .add(new CriteriaWhereValue("id", 2))
        .add(new CriteriaWhereValue("number", "555-555-555"))
    );
```

### Criteria Join

Joins are supported but must be specified as nested relations unlike SQL joins.  There can be multiple basic joins for properties that exist on the primary criteria entity, but all others must be nested within the criteria object being joined.

**Basic Join**

```typescript
let criteria = new Criteria(PhoneNumber)
    .join(new Criteria(User)
        .where(new CriteriaWhereValue("firstName", "Norm"))
    );
```

**Nested Join**

```typescript
let criteria = new Criteria(PhoneNumber)
    .join(new Criteria(User)
        .where(new CriteriaWhereValue("firstName", "Norm"))
        .join(new Criteria(Address)
            .where(new CriteriaWhereValue("city", "Santa Monica"))
        )
    );
```


