// Type definitions for rrepl 2.0
// Project: https://github.com/tough-griff/rrepl
// Definitions by: Griffin Yourick <https://github.com/tough-griff>

import { REPLServer } from 'repl';

export function createRepl(opts: { config?: string }): Promise<REPLServer>;
