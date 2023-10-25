import { Constructable } from "@elevated/objects/lib/types";
export declare enum CriteriaComparison {
    Between = 0,
    Equal = 1,
    GreaterThan = 2,
    GreaterThanEqualTo = 3,
    In = 4,
    LessThan = 5,
    LessThanEqualTo = 6,
    Like = 7,
    NotBetween = 8,
    NotEqual = 9,
    NotIn = 10,
    NotLike = 11,
}
export declare enum CriteriaEvaluation {
    And = 0,
    Or = 1,
}
export declare enum CriteriaJoin {
    Cross = 0,
    FullOuter = 1,
    Inner = 2,
    Left = 3,
    LeftOuter = 4,
    Outer = 5,
    Right = 6,
    RightOuter = 7,
}
export declare enum CriteriaOrder {
    Ascending = 0,
    Descending = 1,
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
export declare abstract class CriteriaWhere {
    evaluation: CriteriaEvaluation;
}
export declare class CriteriaWhereValue extends CriteriaWhere implements CriteriaKeyValue {
    comparison: CriteriaComparison;
    key: string;
    value: any;
    constructor(key: string, value: any, constraints?: CriteriaConstraints);
}
export declare class CriteriaWhereGroup extends CriteriaWhere {
    whereParameters: CriteriaWhere[];
    constructor(evaluation?: CriteriaEvaluation);
    add(parameter: CriteriaWhere): this;
}
export declare class Criteria {
    columns: string[];
    classType: Constructable;
    joinParameters: CriteriaJoinParameter[];
    maxResultCount?: number;
    orderParameters: CriteriaOrderParameter[];
    resultOffset?: number;
    whereParameters: CriteriaWhere[];
    constructor(classType: Constructable);
    join(criteria?: Criteria, columnName?: string): this;
    limit(limit: number): this;
    orderBy(key: string, order?: CriteriaOrder, precedence?: number): this;
    select(...columns: string[]): this;
    startAt(offset: number): this;
    where(parameter: CriteriaWhere): this;
}
