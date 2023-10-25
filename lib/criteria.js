"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
var CriteriaComparison;
(function (CriteriaComparison) {
    CriteriaComparison[CriteriaComparison["Between"] = 0] = "Between";
    CriteriaComparison[CriteriaComparison["Equal"] = 1] = "Equal";
    CriteriaComparison[CriteriaComparison["GreaterThan"] = 2] = "GreaterThan";
    CriteriaComparison[CriteriaComparison["GreaterThanEqualTo"] = 3] = "GreaterThanEqualTo";
    CriteriaComparison[CriteriaComparison["In"] = 4] = "In";
    CriteriaComparison[CriteriaComparison["LessThan"] = 5] = "LessThan";
    CriteriaComparison[CriteriaComparison["LessThanEqualTo"] = 6] = "LessThanEqualTo";
    CriteriaComparison[CriteriaComparison["Like"] = 7] = "Like";
    CriteriaComparison[CriteriaComparison["NotBetween"] = 8] = "NotBetween";
    CriteriaComparison[CriteriaComparison["NotEqual"] = 9] = "NotEqual";
    CriteriaComparison[CriteriaComparison["NotIn"] = 10] = "NotIn";
    CriteriaComparison[CriteriaComparison["NotLike"] = 11] = "NotLike";
})(CriteriaComparison = exports.CriteriaComparison || (exports.CriteriaComparison = {}));
var CriteriaEvaluation;
(function (CriteriaEvaluation) {
    CriteriaEvaluation[CriteriaEvaluation["And"] = 0] = "And";
    CriteriaEvaluation[CriteriaEvaluation["Or"] = 1] = "Or";
})(CriteriaEvaluation = exports.CriteriaEvaluation || (exports.CriteriaEvaluation = {}));
var CriteriaJoin;
(function (CriteriaJoin) {
    CriteriaJoin[CriteriaJoin["Cross"] = 0] = "Cross";
    CriteriaJoin[CriteriaJoin["FullOuter"] = 1] = "FullOuter";
    CriteriaJoin[CriteriaJoin["Inner"] = 2] = "Inner";
    CriteriaJoin[CriteriaJoin["Left"] = 3] = "Left";
    CriteriaJoin[CriteriaJoin["LeftOuter"] = 4] = "LeftOuter";
    CriteriaJoin[CriteriaJoin["Outer"] = 5] = "Outer";
    CriteriaJoin[CriteriaJoin["Right"] = 6] = "Right";
    CriteriaJoin[CriteriaJoin["RightOuter"] = 7] = "RightOuter";
})(CriteriaJoin = exports.CriteriaJoin || (exports.CriteriaJoin = {}));
var CriteriaOrder;
(function (CriteriaOrder) {
    CriteriaOrder[CriteriaOrder["Ascending"] = 0] = "Ascending";
    CriteriaOrder[CriteriaOrder["Descending"] = 1] = "Descending";
})(CriteriaOrder = exports.CriteriaOrder || (exports.CriteriaOrder = {}));
class CriteriaWhere {
    constructor() {
        this.evaluation = CriteriaEvaluation.And;
    }
}
exports.CriteriaWhere = CriteriaWhere;
class CriteriaWhereValue extends CriteriaWhere {
    constructor(key, value, constraints = {}) {
        super();
        this.key = key;
        this.value = value;
        this.comparison = lodash_1.isNil(constraints.comparison)
            ? CriteriaComparison.Equal
            : constraints.comparison;
        if (!lodash_1.isNil(constraints.evaluation)) {
            this.evaluation = constraints.evaluation;
        }
    }
}
exports.CriteriaWhereValue = CriteriaWhereValue;
class CriteriaWhereGroup extends CriteriaWhere {
    constructor(evaluation = CriteriaEvaluation.Or) {
        super();
        this.whereParameters = [];
        this.evaluation = evaluation;
    }
    add(parameter, evaluation = CriteriaEvaluation.And) {
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
exports.CriteriaWhereGroup = CriteriaWhereGroup;
class Criteria {
    constructor(classType) {
        this.columns = [];
        this.joinParameters = [];
        this.orderParameters = [];
        this.whereParameters = [];
        this.classType = classType;
    }
    join(criteria, columnName) {
        this.joinParameters.push({
            criteria,
            type: CriteriaJoin.Inner,
            column: columnName
        });
        return this;
    }
    limit(limit) {
        this.maxResultCount = Math.floor(limit);
        return this;
    }
    orderBy(key, order = CriteriaOrder.Ascending, precedence = 1) {
        this.orderParameters.push({ key, order, precedence });
        return this;
    }
    select(...columns) {
        this.columns = this.columns.concat(columns);
        return this;
    }
    startAt(offset) {
        this.resultOffset = Math.floor(offset);
        return this;
    }
    where(parameter) {
        this.whereParameters.push(parameter);
        return this;
    }
}
exports.Criteria = Criteria;
