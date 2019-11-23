import PATH from "path";

export const TEST_TABLE = 'test_account';

export const PGCONFIG = process.env.PGCONFIG || undefined;

export const TEST_TIMEOUT = process.env.TEST_TIMEOUT ? parseInt(process.env.TEST_TIMEOUT, 10) : undefined;

export const ENABLE_COVERAGE = !!process.env.ENABLE_COVERAGE;

export const SRC_DIR = PATH.resolve( PATH.join(__dirname, ENABLE_COVERAGE ? '../../src-cov' : '../../src') );

export const ENABLE_PGCONFIG = process.env.ENABLE_PGCONFIG ? _.toUpper(process.env.ENABLE_PGCONFIG) === 'TRUE' : !!PGCONFIG;
