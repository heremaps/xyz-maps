import { CloneMode as CloneMode_2 } from '@here/xyz-maps-common';

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * @hidden
 */
declare interface Cache_2<E> {
    hits?: number;
    get(key: E | string): any;
    set(key: E | string, value: Expression | Def): any;
    clear(): any;
}

export declare namespace Color {
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    export type RGBA = [number, number, number, number?];
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    export type Color = string | RGBA | number;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    const toRGB: (color: Color, ignoreNumbers?: boolean) => RGBA;
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * Evaluation context of an expression.
 * Internal, not part of the public API. Do not use directly.
 * @hidden
 */
export declare type Context = {
    [name: string]: any;
};

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * Definition of an expression or value.
 * Internal, not part of the public API. Do not use directly.
 * @hidden
 */
export declare type Def = JSONExpression | Expression | boolean | number | string | null | any[];

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * @hidden
 */
declare type Definitions = {
    [name: string]: Def | Value;
};

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * Expression
 * @hidden
 */
export declare abstract class Expression implements IExpression {
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    static isExpression(exp: any): exp is Expression;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    protected env: ExpressionParser;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    json: JSONExpression;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    abstract eval(context: any): any;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    dynamic(context: Context, start?: number, step?: number, stop?: number): false | Expression;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    protected compileOperand(index: number): any;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    operand(index: number, context?: any): any;
}

export declare enum ExpressionMode {
    static = 0,
    dynamic = 1
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * @hidden
 */
export declare class ExpressionParser {
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    static isJSONExp(exp: any): boolean;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    static Expressions: {
        [op: string]: new (e: JSONExpression, p: ExpressionParser) => Expression & {
            [K in keyof typeof Expression]: typeof Expression[K];
        };
    };
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     */
    context: Context;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Creates an expression parser.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    constructor(definitions?: Definitions, context?: Context);
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     * @param exp
     * @param context
     * @param mode
     * @param cache
     */
    evaluate(exp: Def, context: Context, mode?: ExpressionMode, cache?: any): any;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * @hidden
     * @param mode
     * @param cache
     */
    setMode(mode: ExpressionMode, cache?: Cache_2<Expression>): void;
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * Interface of an expression.
 * Internal, not part of the public API. Do not use directly.
 * @hidden
 */
export declare interface IExpression {
    json: any[];
    eval(context: any): any;
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * JSON representation of an expression.
 * Internal, not part of the public API. Do not use directly.
 * @hidden
 */
export declare type JSONExpression = [string, ...any[]];

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * @hidden
 */
export declare class Listener {
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * LRU Cache
 * @hidden
 */
export declare class LRU<TYPE> {
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * Base class of a task.
 * Internal, not part of the public API. Do not use directly.
 * @hidden
 */
export declare class Task<I = any, O = any, R = O> {
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Creates a task.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    constructor(options?: TaskOptions<I, O, R>, manager?: TaskManager_2);
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Starts the task.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    start(data?: any): void;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Pauses the task.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    pause(): boolean;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Resumes the task.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    resume(): void;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Cancels the task.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    cancel(): boolean;
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * TaskManager
 * @hidden
 */
export declare const TaskManager: {
    getInstance: (time?: number) => TaskManager_2;
    createInstance: (time?: number) => TaskManager_2;
    active: boolean;
};

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * Task scheduler.
 * Internal, not part of the public API. Do not use directly.
 * @hidden
 */
declare class TaskManager_2 {
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Exclusive runtime for all running tasks in ms.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    time: number;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Creates a task manager.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    constructor(time?: number);
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Creates a task.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    create<I = any, O = any>(task: TaskOptions<I, O>): Task<I, O>;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Starts a task.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    start(task: Task, forceSync?: boolean): void;
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Cancels a task.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    cancel(task: Task): boolean;
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * Options of a task.
 * Internal, not part of the public API. Do not use directly.
 * @hidden
 */
export declare interface TaskOptions<I = any, O = any, R = O> {
    priority?: number;
    exec?: (data?: O) => boolean | void;
    init?: (data?: I) => O;
    time?: number;
    onDone?: (data?: R) => void;
    name?: string;
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * Sequence of tasks.
 * Internal, not part of the public API. Do not use directly.
 * @hidden
 */
export declare class TaskSequence<T extends readonly Task<any, any, any>[]> extends Task {
    /**
     * Internal API. Not intended for application use. May change or be removed without notice.
     *
     * Creates a sequence of tasks.
     * Internal, not part of the public API. Do not use directly.
     * @hidden
     */
    constructor(options: {
        tasks: T;
        onDone?: (results?: {
            [K in keyof T]: T[K] extends Task<any, any, infer R> ? R : never;
        }) => void;
        name?: string;
        /**
         * if defined will override priority of all tasks in the sequence,
         * otherwise each task's priority will be used.
         */
        priority?: number;
    }, manager?: TaskManager_2);
}

/**
 * Internal API. Not intended for application use. May change or be removed without notice.
 *
 * @hidden
 */
declare type Value = {
    value: Def;
};

declare namespace vec3 {
    export {

    }
}
export { vec3 }

export { }

declare global {
    /**
     * @public
     * @hidden
     */
    namespace XYZMaps {
        /**
         * @public
         * @hidden
         */
        interface Maps {
            common: typeof import('@here/xyz-maps-common');
        }
        /**
         * @public
         * @hidden
         */
        interface XYZ {
            maps: Maps;
        }
        /**
         * @public
         * @hidden
         */
        interface Here {
            xyz: XYZ;
        }
    }
    /**
     * @public
     * @hidden
     */
    interface Window {
        here: XYZMaps.Here;
    }
    /**
     * @public
     * @hidden
     */
    var here: XYZMaps.Here;
}
