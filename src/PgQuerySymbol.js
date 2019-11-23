
/**
 *
 * @enum {Symbol}
 * @readonly
 */
export const PgQuerySymbol = {

    /**
     * Can be used in a SELECT or an UPDATE query to set time as current time
     */
    NOW : Symbol('NOW'),

    /**
     * Can be used in an UPDATE query to increase the value to the next integer number (eg. for version fields)
     */
    INCREASE : Symbol('INCREASE')

};

export default PgQuerySymbol;
