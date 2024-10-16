import { EzApp } from '../../ez-app';
import {
  ObjectLiteral,
  Repository,
  ColumnType,
  EntitySchemaRelationOptions,
  EntitySchemaColumnOptions,
  EntitySchema,
} from 'typeorm';
import { EntitySchemaOptions } from 'typeorm/entity-schema/EntitySchemaOptions';
import { Plugin } from 'avvio';
import { RelationType as TypeORMRelationType } from 'typeorm/metadata/types/RelationTypes';
import { EzError } from '@ezbackend/utils';
import { generateSchemaName, colTypeToJsonSchemaType } from '..';
import { JSONSchema6, JSONSchema6Definition } from 'json-schema';

enum NormalType {
  VARCHAR = 'VARCHAR',
  INT = 'INT',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  REAL = 'REAL',
  DATE = 'DATE',
  JSON = 'JSON',
  BOOL = 'BOOL',
  ENUM = 'ENUM',
  FILE = 'FILE'
}

enum RelationType {
  ONE_TO_ONE = 'ONE_TO_ONE',
  ONE_TO_MANY = 'ONE_TO_MANY',
  MANY_TO_ONE = 'MANY_TO_ONE',
  MANY_TO_MANY = 'MANY_TO_MANY',
}

export type Type = RelationType | NormalType;
export const Type = { ...RelationType, ...NormalType };

type NestedRelationType = { type: RelationType } & Omit<
  EntitySchemaRelationOptions,
  'type'
>;
type NestedNormalType = { type: NormalType | ColumnType } & Omit<
  EntitySchemaColumnOptions,
  'type'
>;

export type FullType =
  | NormalType
  | RelationType
  | NestedNormalType
  | NestedRelationType;

export type ModelSchema = {
  [index: string]: FullType;
};

// URGENT TODO: Allow array?
// URGENT TODO: Allow normal typeorm types?

function normalTypeToTypeORMtype(type: NormalType | ColumnType): ColumnType {
  switch (type) {
    case NormalType.FILE:
      // URGENT TODO: Make this a virtual column instead?
      // When the user specifies a file, we only store the download URL in the database
      return 'simple-json'
    case NormalType.VARCHAR:
      return 'varchar';
    case NormalType.INT:
      return 'integer';
    case NormalType.FLOAT:
      return 'float';
    case NormalType.DOUBLE:
      return 'double';
    case NormalType.REAL:
      return 'real';
    case NormalType.DATE:
      return 'date';
    case NormalType.BOOL:
      return 'boolean';
    case NormalType.JSON:
      // URGENT TODO: Switch between simple json and normal json depending on postgres column?
      return 'simple-json';
    case NormalType.ENUM:
      // URGENT URGENT TODO: Test case for this
      // URGENT URGENT TODO: See if 'enum' instead of simple-enum works
      // URGENT URGENT TODO: Good error message when enum values are not specified
      return 'simple-enum';

    default:
      return type;
  }
}

function relationTypeToTypeORMrelation(
  type: RelationType,
): TypeORMRelationType {
  switch (type) {
    case RelationType.ONE_TO_MANY:
      return 'one-to-many';
    case RelationType.ONE_TO_ONE:
      return 'one-to-one';
    case RelationType.MANY_TO_ONE:
      return 'many-to-one';
    case RelationType.MANY_TO_MANY:
      return 'many-to-many';
  }
}

export function isRelation(type: FullType): type is RelationType {
  return Object.values(RelationType).includes(type as RelationType);
}

export function isNestedRelation(type: FullType): type is NestedRelationType {
  return Object.values(RelationType).includes(
    (type as NestedRelationType).type,
  );
}

export function isNormalType(type: FullType): type is NormalType {
  return Object.values(NormalType).includes(type as NormalType);
}

export function isNestedNormalType(type: FullType): type is NestedNormalType {
  const ColumnType: Array<ColumnType> = [
    'int',
    'int2',
    'int4',
    'int8',
    'integer',
    'tinyint',
    'smallint',
    'mediumint',
    'bigint',
    'dec',
    'decimal',
    'smalldecimal',
    'fixed',
    'numeric',
    'number',
    'geometry',
    'geography',
    'st_geometry',
    'st_point',
    'float',
    'double',
    'dec',
    'decimal',
    'smalldecimal',
    'fixed',
    'numeric',
    'real',
    'double precision',
    'number',
    'datetime',
    'datetime2',
    'datetimeoffset',
    'time',
    'time with time zone',
    'time without time zone',
    'timestamp',
    'timestamp without time zone',
    'timestamp with time zone',
    'timestamp with local time zone',
    'character varying',
    'varying character',
    'char varying',
    'nvarchar',
    'national varchar',
    'character',
    'native character',
    'varchar',
    'char',
    'nchar',
    'national char',
    'varchar2',
    'nvarchar2',
    'alphanum',
    'shorttext',
    'raw',
    'binary',
    'varbinary',
    'string',
    'tinyint',
    'smallint',
    'mediumint',
    'int',
    'bigint',
    'simple-array',
    'simple-json',
    'simple-enum',
    'int2',
    'integer',
    'int4',
    'int8',
    'int64',
    'unsigned big int',
    'float',
    'float4',
    'float8',
    'smallmoney',
    'money',
    'boolean',
    'bool',
    'tinyblob',
    'tinytext',
    'mediumblob',
    'mediumtext',
    'blob',
    'text',
    'ntext',
    'citext',
    'hstore',
    'longblob',
    'longtext',
    'alphanum',
    'shorttext',
    'bytes',
    'bytea',
    'long',
    'raw',
    'long raw',
    'bfile',
    'clob',
    'nclob',
    'image',
    'timetz',
    'timestamptz',
    'timestamp with local time zone',
    'smalldatetime',
    'date',
    'interval year to month',
    'interval day to second',
    'interval',
    'year',
    'seconddate',
    'point',
    'line',
    'lseg',
    'box',
    'circle',
    'path',
    'polygon',
    'geography',
    'geometry',
    'linestring',
    'multipoint',
    'multilinestring',
    'multipolygon',
    'geometrycollection',
    'st_geometry',
    'st_point',
    'int4range',
    'int8range',
    'numrange',
    'tsrange',
    'tstzrange',
    'daterange',
    'enum',
    'set',
    'cidr',
    'inet',
    'macaddr',
    'bit',
    'bit varying',
    'varbit',
    'tsvector',
    'tsquery',
    'uuid',
    'xml',
    'json',
    'jsonb',
    'varbinary',
    'hierarchyid',
    'sql_variant',
    'rowid',
    'urowid',
    'uniqueidentifier',
    'rowversion',
    'array',
    'cube',
    'ltree',
  ];
  return (Object.values(NormalType) as Array<NormalType | ColumnType>)
    .concat(ColumnType)
    .includes((type as NestedNormalType).type);
}

function schemaToEntityOptions(schema: ModelSchema) {
  const columns: { [key: string]: EntitySchemaColumnOptions } = {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    // URGENT TODO: Figure out why TypeORM is not automatically generating the createdAt and updatedAt dates
    // createdAt: {
    //     type: 'date',
    //     createDate: true
    // },
    // updatedAt: {
    //     type: 'date',
    //     updateDate: true
    // }
  };
  const relations: { [key: string]: EntitySchemaRelationOptions } = {};
  Object.entries(schema).forEach(([key, value]) => {
    // URGENT TODO: Allow proper overridding of default columns
    if (isNormalType(value)) {
      columns[key] = {
        type: normalTypeToTypeORMtype(value),
      };
      return;
    }
    if (isNestedNormalType(value)) {
      if (value.primary === true) {
        throw new EzError(
          'EzBackend currently only supports one Primary Column per entity',
          'A primary id column is created by default for all models. While typeorm supports composite primary keys, EzBackend currently does not support this feature. If you need it drop us a message in github',
          `
new EzModel("IllegalModel", {
    mySecondPrimaryColumn: {
        type: Type.VARCHAR,
        primary: true //This is illegal
    }
})`,
        );
      }

      const { type, ...noType } = value;
      columns[key] = {
        type: normalTypeToTypeORMtype(value.type),
        ...noType,
      };
    }
    if (isRelation(value)) {
      throw new EzError(
        'You currently need to use the full declaration for specifying a relation',
        'Relations require additional metadata to generate the Database Tables',
        `
Replace

myRelation: Type.ONE_TO_ONE

With

myRelation: {
    type: Type.ONE_TO_ONE,
    joinColumn: true,
    target:'detail'
},
                `,
      );
      // Note: This makes it compulsory for the key to be the name of relation
      // relations[key] = {
      //     type: relationTypeToTypeORMrelation(value),
      //     target: key
      // }
      // return
    }
    if (isNestedRelation(value)) {
      const { type, ...noType } = value;
      relations[key] = {
        type: relationTypeToTypeORMrelation(value.type),
        ...noType,
      };
    }
  });

  return { columns, relations };
}

export type RepoOptions = Omit<
  EntitySchemaOptions<any>,
  'name' | 'columns' | 'relations'
>;

// TODO: Think about function naming
function entityGeneratorFactory(
  modelName: string,
  modelSchema: ModelSchema,
  repoOpts: RepoOptions,
) {
  const entityGenerator: Plugin<any, any> = async (instance, opts) => {
    const { columns, relations } = schemaToEntityOptions(modelSchema);
    const newEntity = new EntitySchema({
      name: modelName,
      columns,
      relations,
      ...repoOpts,
    });
    instance.entities.push(newEntity);
  };
  return entityGenerator;
}

export class EzRepo extends EzApp {

  // NOTE: We are creating global application state in terms of repos. Happy to debate if you can think of a better way for the same use case
  private static ezRepos: { [key: string]: EzRepo } = {}

  // URGENT TODO : Think if there is a better way of unregistering the repos
  static unregisterEzRepos() {
    EzRepo.ezRepos = {}
  }

  private static registerEzRepo(repo: EzRepo, name?: string) {
    const repoName = name ?? repo._modelName
    if (Object.keys(EzRepo.ezRepos).includes(repoName)) {
      throw new EzError("EzRepo Name has already been used",
        `Each EzRepo needs to have a unique name, a EzRepo with the name ${repoName} has already been registered`)
    }
    EzRepo.ezRepos[repoName] = repo
  }

  static getAllEzRepos() {
    return EzRepo.ezRepos
  }

  static getEzRepo(name: string) {
    if (!Object.keys(EzRepo.ezRepos).includes(name)) {
      throw new EzError(`EzRepo with name ${name} not found`,
        `Each EzRepo is registered with a unique name in the constructor. Are you sure EzRepo: ${name} has been registered yet?`)
    }
    return EzRepo.ezRepos[name]
  }

  protected _modelName: string
  protected _modelSchema: ModelSchema
  protected _repoOpts: RepoOptions
  protected _repo: Repository<ObjectLiteral> | undefined;

  constructor(
    modelName: string,
    modelSchema: ModelSchema,
    repoOpts: RepoOptions = {},
  ) {
    super();
    EzRepo.registerEzRepo(this, modelName)
    this._modelName = modelName
    this._modelSchema = modelSchema
    this._repoOpts = repoOpts
    this.setInit(
      `Create "${modelName}" Entity`,
      entityGeneratorFactory(modelName, modelSchema, repoOpts),
    );

    this.setPostInit(
      `Obtain ${modelName} Repository`,
      async (instance, opts) => {
        instance.ezRepo = this
        instance.repo = instance.orm.getRepository(modelName);
        this._repo = instance.repo;
      },
    );
  }

  generateNonNestedSchema(
    schemaType: 'updateSchema' | 'createSchema' | 'fullSchema',
    columns: [string, EntitySchemaColumnOptions][],
    prefix?: string,
  ): JSONSchema6 {
    return columns.reduce((jsonSchema, [key, value]) => {
      return {
        $id: jsonSchema.$id,
        type: jsonSchema.type,
        properties: {
          ...jsonSchema.properties,
          [key]: columnOptionsToSchemaProps(value),
        },
      };
    },
      {
        $id: generateSchemaName(this._modelName, schemaType, prefix),
        type: 'object',
        properties: {},
      })
  }

  addNestedSchemas(originalSchema: JSONSchema6,
    relevantRelationColumns: {
      data: EntitySchemaRelationOptions;
      isMany: boolean;
      propertyName: string;
    }[],
    recursiveFunctionName: keyof EzRepo) {

    const schemaWithNestedRelations = relevantRelationColumns.reduce((jsonSchema, relationData) => {
      if (typeof relationData.data.target !== 'string') {
        throw new EzError("target of type function not supported",

          "Currently EzBackend does not support functions for the target of relations. Raise an issue on github if you require this functionality")
      }
      const nestedSchema = removeId(EzRepo.getEzRepo(relationData.data.target)[recursiveFunctionName]())
      return {
        $id: jsonSchema.$id,
        type: jsonSchema.type,
        properties: {
          ...jsonSchema.properties,
          // TODO: Make this work with ref schemas PLEASE
          [relationData.propertyName]: relationData.isMany
            ? makeArray(nestedSchema)
            : nestedSchema,
        },
      };
    }, originalSchema)

    return schemaWithNestedRelations

  }

  getUpdateSchema(prefix?: string) {
    const entityOptions = schemaToEntityOptions(this._modelSchema)
    const nonGeneratedColumns = Object.entries(entityOptions.columns).filter(([colName, colData]) => {
      return !isGeneratedCol(colData)
    })
    const updateSchema = this.generateNonNestedSchema('updateSchema', nonGeneratedColumns, prefix)
    // Add cascade update columns
    const cascadeUpdateRelations = getRelevantNestedRelations(entityOptions.relations, 'update')
    const updateSchemaWithRelations = this.addNestedSchemas(updateSchema, cascadeUpdateRelations, 'getUpdateSchema')
    return updateSchemaWithRelations
  }

  getCreateSchema(prefix?: string) {
    const entityOptions = schemaToEntityOptions(this._modelSchema)
    const nonGeneratedColumns = Object.entries(entityOptions.columns).filter(([colName, colData]) => {
      return !isGeneratedCol(colData)
    })
    const createSchema = this.generateNonNestedSchema('createSchema', nonGeneratedColumns, prefix)
    // Add cascade update columns
    const cascadeUpdateRelations = getRelevantNestedRelations(entityOptions.relations, 'create')
    const createSchemaWithRelations = this.addNestedSchemas(createSchema, cascadeUpdateRelations, 'getCreateSchema')
    const requiredPropertyNames = Object.entries(entityOptions.columns)
      .filter(([colName, colData]) => {
        return !colData.generated && !colData.nullable && colData.default === undefined
      })
      .map(([colName, colData]) => {
        return colName
      })
    createSchemaWithRelations.required = requiredPropertyNames
    return createSchemaWithRelations
  }

  getFullSchema(prefix?: string) {
    const entityOptions = schemaToEntityOptions(this._modelSchema)
    const columns = Object.entries(entityOptions.columns)
    const fullSchema = this.generateNonNestedSchema('fullSchema', columns, prefix)
    // Add eagerly loaded columns
    const eagerRelations = getRelevantNestedRelations(entityOptions.relations, 'read')
    const fullSchemaWithRelations = this.addNestedSchemas(fullSchema, eagerRelations, 'getFullSchema')
    return fullSchemaWithRelations
  }

  getFormCreateSchema(prefix?: string) {
    const newSchema = this.getCreateSchema(prefix)
    newSchema.$id = generateSchemaName(this._modelName, 'formCreateSchema', prefix)
    const filePropertyNames = Object.entries(this._modelSchema)
      .reduce((previousValue, [key, value]) => {
        if (value === Type.FILE) {
          previousValue.push(key)
          return previousValue
        } else {
          return previousValue
        }
      }, [] as Array<string>)
    filePropertyNames.forEach(filePropertyName => {
      if (!newSchema.properties) return

      newSchema.properties[filePropertyName] = {
        type: 'object',
        // @ts-ignore
        customSwaggerProps: {
          type: 'file'
        }
      }
    })

    // URGENT TODO: Handle nested properties

    return newSchema
  }

  getFormUpdateSchema(prefix?: string) {
    // URGENT TODO: Code below and above is the same, can we keep it DRY
    const newSchema = this.getUpdateSchema(prefix)
    newSchema.$id = generateSchemaName(this._modelName, 'formUpdateSchema', prefix)
    const filePropertyNames = Object.entries(this._modelSchema)
      .reduce((previousValue, [key, value]) => {
        if (value === Type.FILE) {
          previousValue.push(key)
          return previousValue
        } else {
          return previousValue
        }
      }, [] as Array<string>)
    filePropertyNames.forEach(filePropertyName => {
      if (!newSchema.properties) return

      newSchema.properties[filePropertyName] = {
        type: 'object',
        // @ts-ignore
        customSwaggerProps: {
          type: 'file'
        }
      }
    })

    // URGENT TODO: Handle nested properties

    return newSchema
  }

  getRepo(): Repository<ObjectLiteral> {
    if (this._repo === undefined) {
      throw new EzError(
        'Can only call getRepo() in lifecyle preHandler to postRun',
        'The repo is only defined in the postInit lifecycle, so it can only be referenced after that',
        `
model.setHandler("Handle Repo", async (instance, opts) => {
    const repo = model.getRepo()
    //Do stuff with repo
})`,
      );
    }
    return this._repo;
  }
}

function getRelevantNestedRelations(
  relations: { [key: string]: EntitySchemaRelationOptions },
  type: 'create' | 'update' | 'read'
) {
  const relevantRelations = Object.entries(relations).filter(([relationKey, relationData]) => {

    switch (type) {
      case 'create':
        return (Array.isArray(relationData.cascade) && relationData.cascade.includes('insert')) || relationData.cascade === true
      case 'update':
        return (Array.isArray(relationData.cascade) && relationData.cascade.includes('update')) || relationData.cascade === true
      case 'read':
        return relationData.eager === true
    }

    return new EzError("Unexpected Nested Relation Type",
      "For the function getRelevantNestedRelations, only types 'create','update' and 'read' are supported")

  })

  // Morph the data into a more usable format

  const formattedRelevantRelations = relevantRelations.map(([relationKey, relationData]) => {
    return {
      data: relationData,
      isMany: relationData.type === 'one-to-many' || relationData.type === 'many-to-many',
      propertyName: relationKey
    }
  })


  return formattedRelevantRelations
}

function makeArray(schema: any) {
  return {
    type: 'array',
    items: schema,
  };
}

function isGeneratedCol(col: EntitySchemaColumnOptions) {
  if (col.generated || col.createDate || col.updateDate || col.deleteDate) return true
  else return false
}

function removeId(object: any) {
  delete object.$id;
  return object;
}

function columnOptionsToSchemaProps(colOpts: EntitySchemaColumnOptions) {
  const type = colTypeToJsonSchemaType(colOpts.type)
  if (type === 'object') {
    // TODO: Consider if this is the best way of accepting additional properties for simple json, especially if the simple json needs to have a coerced data structure
    return {
      additionalProperties: true,
      type: 'object',
    };
  }
  return { type };
}