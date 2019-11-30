
/**
 *
 * @enum {string}
 * @readonly
 */
export const PgOperatorFormat = {

    NOT                   : 'NOT %0',
    IS                    : '%0 IS %1',
    IS_NULL               : '%0 IS NULL',
    IS_NOT_NULL           : '%0 IS NOT NULL',
    LESS                  : '%0 < %1',
    GREATER               : '%0 > %1',
    LESS_OR_EQUAL         : '%0 <= %1',
    GREATER_OR_EQUAL      : '%0 >= %1',
    EQUAL                 : '%0 = %1',
    NOT_EQUAL             : '%0 != %1',
    BETWEEN               : '%0 BETWEEN %1 AND %2',
    NOT_BETWEEN           : '%0 NOT BETWEEN %1 AND %2',
    BETWEEN_SYMMETRIC     : '%0 BETWEEN SYMMETRIC %1 AND %2',
    NOT_BETWEEN_SYMMETRIC : '%0 NOT BETWEEN SYMMETRIC %1 AND %2'

};

export default PgOperatorFormat;
