import { isNil } from "lodash";
import { Constructable } from "@elevated/objects/lib/types";

export enum CriteriaComparison {
    Between,
    Equal,
    GreaterThan,
    GreaterThanEqualTo,
    In,
    LessThan,
    LessThanEqualTo,
    Like,
    NotBetween,
    NotEqual,
    NotIn,
    NotLike
}

export enum CriteriaEvaluation {
    And,
    Or
}

export enum CriteriaJoin {
    Cross,
    FullOuter,
    Inner,
    Left,
    LeftOuter,
    Outer,
    Right,
    RightOuter
}

export enum CriteriaOrder {
    Ascending,
    Descending
}

export interface CriteriaKeyValue {
    key: string;
    value: any;
}

export interface CriteriaConstraints {
    comparison?: CriteriaComparison;
    evaluation?: CriteriaEvaluation;
}

export interface CriteriaOrderParameter {
    key: string;
    order: CriteriaOrder;
    precedence?: number;
}

export interface CriteriaJoinParameter {
    criteria: Criteria;
    type: CriteriaJoin;
    column?: string;
}

export abstract class CriteriaWhere {
    public evaluation: CriteriaEvaluation = CriteriaEvaluation.And;
}

export class CriteriaWhereValue extends CriteriaWhere implements CriteriaKeyValue {
    public comparison: CriteriaComparison;
    public key: string;
    public value: any;

    constructor(key: string, value: any, constraints: CriteriaConstraints = {}) {
        super();

        this.key = key;
        this.value = value;

        this.comparison = isNil(constraints.comparison)
            ? CriteriaComparison.Equal
            : constraints.comparison;

        if (!isNil(constraints.evaluation)) {
            this.evaluation = constraints.evaluation;
        }
    }
}

export class CriteriaWhereGroup extends CriteriaWhere {
    public whereParameters: CriteriaWhere[] = [];

    public constructor(evaluation: CriteriaEvaluation = CriteriaEvaluation.Or) {
        super();
        this.evaluation = evaluation;
    }

    public add(parameter: CriteriaWhere): this;
    public add(parameter: object, evaluation = CriteriaEvaluation.And): this {
        if (parameter instanceof CriteriaWhere) {
            this.whereParameters.push(parameter);
        }
        else {
            for (const key of Object.keys(parameter)) {
                this.add(new CriteriaWhereValue(key, parameter[key], { evaluation }));
            }
        }

        return this;
    }
}

export class Criteria {
    public columns: string[] = [];
    public classType: Constructable;
    public joinParameters: CriteriaJoinParameter[] = [];
    public maxResultCount?: number;
    public orderParameters: CriteriaOrderParameter[] = [];
    public resultOffset?: number;
    public whereParameters: CriteriaWhere[] = [];

    public constructor(classType: Constructable) {
        this.classType = classType;
    }

    public join(criteria?: Criteria, columnName?: string): this {
        this.joinParameters.push({
            criteria,
            type: CriteriaJoin.Inner,
            column: columnName
        });
        return this;
    }

    public limit(limit: number): this {
        this.maxResultCount = Math.floor(limit);
        return this;
    }

    public orderBy(key: string, order: CriteriaOrder = CriteriaOrder.Ascending, precedence = 1): this {
        this.orderParameters.push({ key, order, precedence });
        return this;
    }

    public select(...columns: string[]): this {
        this.columns = this.columns.concat(columns);
        return this;
    }

    public startAt(offset: number): this {
        this.resultOffset = Math.floor(offset);
        return this;
    }

    public where(parameter: CriteriaWhere): this {
        this.whereParameters.push(parameter);
        return this;
    }
}
