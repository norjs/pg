
/**
 *
 * @enum {string}
 * @readonly
 */
export const PgOperator = {

    NOT                   : 'NOT',
    IS                    : 'IS',
    IS_NULL               : 'IS_NULL',
    IS_NOT_NULL           : 'IS_NOT_NULL',
    LESS                  : '<',
    GREATER               : '>',
    LESS_OR_EQUAL         : '<=',
    GREATER_OR_EQUAL      : '>=',
    EQUAL                 : '=',
    NOT_EQUAL             : '!=',
    BETWEEN               : 'BETWEEN',
    NOT_BETWEEN           : 'NOT_BETWEEN',
    BETWEEN_SYMMETRIC     : 'BETWEEN_SYMMETRIC',
    NOT_BETWEEN_SYMMETRIC : 'NOT_BETWEEN_SYMMETRIC'

};

export default PgOperator;
